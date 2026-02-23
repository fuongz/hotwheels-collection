import type { DrizzleD1Database } from "drizzle-orm/d1";
import { inArray } from "drizzle-orm";
import { dbClient } from "../src/db/d1";
import { CollectionsRepository } from "../src/db/d1/repositories/series-repository";
import { CacheService } from "../src/cache/kv/cache.service";
import { castings, collections, NewRelease, releases } from "../src/db/d1/schema";
import { inferCategoryCode } from "../src/lib/infer-collection-category";
import { slugToCode } from "../src/lib/slug-to-code";

// -- helpers
import { generatePhotoKey, uploadImageToR2 } from "../src/storages/r2";

// D1 SQL variable limit is 100, so we need to batch operations
// collections: ~4 vars/row, castings: ~5 vars/row, releases: ~8 vars/row
const BATCH_SIZE_COLLECTIONS = 10;
const BATCH_SIZE_CASTINGS = 10;
const BATCH_SIZE_RELEASES = 5;
const BATCH_SIZE_QUERY = 90; // For inArray queries with a single column
const WIKI_URL_PREFIX = "https://hotwheels.fandom.com/wiki/";

class UpsertCars {
	private db: DrizzleD1Database | undefined;
	private bucket?: R2Bucket;
	private cacheService?: CacheService;
	private collectionsRepo?: CollectionsRepository;

	constructor(env: CloudflareBindings) {
		if (env.DB) {
			this.db = dbClient(env.DB);
			this.collectionsRepo = new CollectionsRepository(this.db);
		}
		if (env.KV) {
			this.cacheService = new CacheService(env.KV);
		}
		this.bucket = env.BUCKET;
	}

	// Upload photos in the background without blocking
	private async uploadPhotosInBackground(items: HotWheelData[]): Promise<void> {
		if (!this.bucket) return;

		const bucket = this.bucket;
		let uploadedCount = 0;
		const totalPhotos = items.reduce(
			(sum, item) => sum + item.photo_url.length,
			0,
		);

		console.log(
			`----> LOG [Background] Uploading ${totalPhotos} photos for ${items.length} cars...`,
		);

		const uploadPromises = items.flatMap((item) =>
			item.photo_url.map(async (url, i) => {
				try {
					const key = generatePhotoKey(item.toy_num ?? "", item.year, i, url);
					await uploadImageToR2(bucket, url, key);
					uploadedCount++;
					if (uploadedCount % 10 === 0) {
						console.log(
							`----> LOG [Background] Progress: ${uploadedCount}/${totalPhotos} photos uploaded`,
						);
					}
				} catch (error) {
					console.error(
						`----> ERROR [Background] Failed to upload photo for ${item.toy_num}:`,
						error,
					);
				}
			}),
		);

		await Promise.all(uploadPromises);
		console.log(
			`----> LOG [Background] ✓ Completed uploading ${uploadedCount}/${totalPhotos} photos`,
		);
	}

	// Phase 1: Upsert unique collections extracted from series data.
	// Uses series slug as the collection code (unique conflict target).
	// categoryCode defaults to "mainline" for yearly list scrapes.
	private async bulkUpsertCollections(
		items: HotWheelData[],
	): Promise<Map<string, number>> {
		if (!this.collectionsRepo || !this.db)
			throw new Error("CollectionsRepo or DB not initialized");

		const uniqueCollections = new Map<
			string,
			{ name: string; wikiSlug: string }
		>();

		for (const item of items) {
			for (const seriesItem of item.series) {
				const code = slugToCode(seriesItem.slug);
				if (!uniqueCollections.has(code)) {
					uniqueCollections.set(code, {
						name: seriesItem.name,
						wikiSlug: seriesItem.slug,
					});
				}
			}
		}

		const collectionsArray = Array.from(uniqueCollections.entries()).map(
			([code, data]) => ({
				code,
				name: data.name,
				wikiSlug: data.wikiSlug,
				categoryCode: inferCategoryCode(data.wikiSlug, data.name),
			}),
		);

		if (collectionsArray.length === 0) {
			console.log("----> LOG [Bulk] No collections to upsert");
			return new Map<string, number>();
		}

		for (let i = 0; i < collectionsArray.length; i += BATCH_SIZE_COLLECTIONS) {
			const batch = collectionsArray.slice(i, i + BATCH_SIZE_COLLECTIONS);
			await this.db
				.insert(collections)
				.values(batch)
				.onConflictDoUpdate({
					target: collections.code,
					set: { name: collections.name, updatedAt: new Date() },
				});
			console.log(
				`----> LOG [Bulk] Upserted collections batch ${Math.floor(i / BATCH_SIZE_COLLECTIONS) + 1}/${Math.ceil(collectionsArray.length / BATCH_SIZE_COLLECTIONS)} (${batch.length} items)`,
			);
		}

		// Fetch all to build slug → id map
		const allCollections = await this.collectionsRepo.getAll();
		const collectionsMap = new Map<string, number>();
		for (const col of allCollections) {
			collectionsMap.set(col.code, col.id);
		}

		console.log(
			`----> LOG [Bulk] Upserted ${collectionsArray.length} collections total`,
		);
		return collectionsMap;
	}

	// Phase 2: Upsert unique castings (base models/molds).
	// Deduplicates by model slug (used as casting code).
	private async bulkUpsertCastings(
		items: HotWheelData[],
		noPhotos: boolean,
	): Promise<Map<string, string>> {
		if (!this.db) throw new Error("DB not initialized");

		// Generate R2 photo keys immediately (upload happens async later)
		const photoKeys = items.map((item) => {
			if (!this.bucket || item.photo_url.length === 0) return item.photo_url;
			return item.photo_url.map((url, i) =>
				`r2://${generatePhotoKey(item.toy_num ?? "", item.year, i, url)}`,
			);
		});

		// Deduplicate by model slug — first occurrence wins for avatarUrl
		const uniqueCastings = new Map<
			string,
			{ name: string; wikiSlug: string | null; avatarUrl: string | undefined }
		>();
		items.forEach((item, index) => {
			const castingCode = slugToCode(item.model.slug ?? item.model.name);
			if (!uniqueCastings.has(castingCode)) {
				uniqueCastings.set(castingCode, {
					name: item.model.name,
					wikiSlug: item.model.slug ?? null,
					avatarUrl: photoKeys[index][0],
				});
			}
		});

		const castingsArray = Array.from(uniqueCastings.entries()).map(
			([code, data]) => ({
				code,
				name: data.name,
				wikiSlug: data.wikiSlug,
				avatarUrl: data.avatarUrl,
			}),
		);

		if (castingsArray.length === 0) {
			console.log("----> LOG [Bulk] No castings to upsert");
			return new Map<string, string>();
		}

		for (let i = 0; i < castingsArray.length; i += BATCH_SIZE_CASTINGS) {
			const batch = castingsArray.slice(i, i + BATCH_SIZE_CASTINGS);
			await this.db
				.insert(castings)
				.values(batch)
				.onConflictDoUpdate({
					target: castings.code,
					set: {
						name: castings.name,
						avatarUrl: castings.avatarUrl,
						updatedAt: new Date(),
					},
				});
			console.log(
				`----> LOG [Bulk] Upserted castings batch ${Math.floor(i / BATCH_SIZE_CASTINGS) + 1}/${Math.ceil(castingsArray.length / BATCH_SIZE_CASTINGS)} (${batch.length} items)`,
			);
		}

		// Fetch inserted castings to build code → id map
		const castingsMap = new Map<string, string>();
		const codes = castingsArray.map((c) => c.code);

		for (let i = 0; i < codes.length; i += BATCH_SIZE_QUERY) {
			const batch = codes.slice(i, i + BATCH_SIZE_QUERY);
			const batchCastings = await this.db
				.select()
				.from(castings)
				.where(inArray(castings.code, batch))
				.all();
			for (const c of batchCastings) {
				castingsMap.set(c.code, c.id);
			}
		}

		console.log(
			`----> LOG [Bulk] Upserted ${castingsArray.length} castings total`,
		);

		if (this.bucket && !noPhotos) {
			console.log(
				`----> LOG [Bulk] Starting async photo uploads for ${items.length} cars...`,
			);
			this.uploadPhotosInBackground(items).catch((error: unknown) => {
				console.error(
					"----> ERROR [Bulk] Background photo upload failed:",
					error,
				);
			});
		}

		return castingsMap;
	}

	// Phase 3: Upsert releases — one release per item using item.series[0] as
	// the primary collection. Deletes existing releases for affected castings
	// before reinserting to ensure idempotency.
	private async bulkUpsertReleases(
		items: HotWheelData[],
		collectionsMap: Map<string, number>,
		castingsMap: Map<string, string>,
	): Promise<void> {
		if (!this.db) throw new Error("DB not initialized");

		const releasesArray: Array<NewRelease> = [];

		for (const item of items) {
			if (!item.model.slug) continue;
			const castingId = castingsMap.get(slugToCode(item.model.slug));
			if (!castingId) continue;

			// Use the first (primary) series as the release's collection
			const primarySeries = item.series[0];
			if (!primarySeries) continue;

			const collectionId = collectionsMap.get(slugToCode(primarySeries.slug));
			if (!collectionId) continue;

			const isSuperTreasureHunt = item.series.some((s) =>
				/\d{4}_Treasure_Hunts_Series#Super_Treasure_Hunts/.test(s.slug),
			);
			const isTreasureHunt =
				!isSuperTreasureHunt &&
				item.series.some((s) => /\d{4}_Treasure_Hunts_Series#Treasure_Hunts$/.test(s.slug));

			releasesArray.push({
				castingId,
				collectionId,
				year: Number(item.year),
				releaseName: item.model.name,
				toyIndex: Number(item.col_num),
				wikiSlug: item.model.slug,
				wikiUrl: `${WIKI_URL_PREFIX}${item.model.slug}`,
				mainlineNumber: item.col_num ? `${item.col_num}/250` : null,
				subSeriesNumber: item.series_num || null,
				releaseCode: item.toy_num,
				avatarUrl:
					item.photo_url.length > 0
						? `r2://${generatePhotoKey(item.toy_num ?? "", item.year, 0, item.photo_url[0])}`
						: null,
				isTreasureHunt,
				isSuperTreasureHunt,
			});
		}

		if (releasesArray.length === 0) {
			console.log("----> LOG [Bulk] No releases to insert");
			return;
		}

		// Delete existing releases for affected castings to avoid duplicates
		const castingIds = Array.from(
			new Set(releasesArray.map((r) => r.castingId)),
		);
		for (let i = 0; i < castingIds.length; i += BATCH_SIZE_QUERY) {
			const batch = castingIds.slice(i, i + BATCH_SIZE_QUERY);
			await this.db
				.delete(releases)
				.where(inArray(releases.castingId, batch))
				.execute();
		}
		console.log(
			`----> LOG [Bulk] Cleared existing releases for ${castingIds.length} castings`,
		);

		// Bulk insert releases in batches
		for (let i = 0; i < releasesArray.length; i += BATCH_SIZE_RELEASES) {
			const batch = releasesArray.slice(i, i + BATCH_SIZE_RELEASES);
			await this.db.insert(releases).values(batch).execute();
			console.log(
				`----> LOG [Bulk] Inserted releases batch ${Math.floor(i / BATCH_SIZE_RELEASES) + 1}/${Math.ceil(releasesArray.length / BATCH_SIZE_RELEASES)} (${batch.length} items)`,
			);
		}

		console.log(
			`----> LOG [Bulk] Inserted ${releasesArray.length} releases total`,
		);
	}

	async getFromCache(year: string) {
		if (!this.cacheService) return;

		const meta = await this.cacheService.get<{
			totalChunks: number;
			totalItems: number;
			chunkSize: number;
		}>(`scrape:results:${year}:meta`);

		if (!meta) {
			console.log(
				`----> LOG [Cache] No metadata found for year ${year} in cache!`,
			);
			return;
		}

		console.log(
			`----> LOG [Cache] Found ${meta.totalChunks} chunks with ${meta.totalItems} total items for year ${year}`,
		);

		const items: HotWheelData[] = [];

		for (let chunkIndex = 0; chunkIndex < meta.totalChunks; chunkIndex++) {
			console.log(
				`----> LOG [Processing] Chunk ${chunkIndex + 1}/${meta.totalChunks}`,
			);
			const hotWheelData = await this.cacheService.get<HotWheelData[]>(
				`scrape:results:${year}:chunk:${chunkIndex}`,
			);
			if (!hotWheelData || hotWheelData.length === 0) {
				console.log(
					`----> LOG [Cache] No data found for chunk ${chunkIndex} of year ${year}`,
				);
				continue;
			}
			items.push(...hotWheelData);
			console.log(
				`----> LOG [Processing] Completed chunk ${chunkIndex + 1}/${meta.totalChunks}`,
			);
		}

		console.log(
			`----> LOG [Processing] Completed all ${meta.totalChunks} chunks for year ${year}`,
		);
		return items;
	}

	async run(year: string, _overwrite: boolean = false) {
		const items = await this.getFromCache(year);
		if (!items || items.length === 0) {
			console.log(`----> LOG [Bulk] No items found for year ${year}`);
			return;
		}

		console.log(
			`----> LOG [Bulk] Starting bulk upsert for ${items.length} items from year ${year}`,
		);

		try {
			// Phase 1: Upsert collections (from series data)
			const collectionsMap = await this.bulkUpsertCollections(items);

			// Phase 2: Upsert castings (unique base models, starts async photo upload)
			const castingsMap = await this.bulkUpsertCastings(items, false);

			// Phase 3: Upsert releases (one per item, linked to casting + collection)
			await this.bulkUpsertReleases(items, collectionsMap, castingsMap);

			console.log(
				`----> LOG [Bulk] ✓ Completed bulk upsert for ${items.length} cars from year ${year}`,
			);

			if (this.cacheService) {
				await this.cacheService.invalidateAllCars();
				console.log("----> LOG [Bulk] ✓ KV cache cleared");
			}
		} catch (error) {
			console.error(
				`----> ERROR [Bulk] Failed to upsert items for year ${year}:`,
				error,
			);
			throw error;
		}
	}
}

export { UpsertCars };
