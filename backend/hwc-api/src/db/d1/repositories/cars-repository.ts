import { and, eq, inArray, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { CacheService } from "../../../cache/kv/cache.service";
import { FandomProvider, generateSlug } from "../../../providers/fandom";
import {
	CloudinaryClient,
	createCloudinaryClient,
} from "../../../storages/cloudinary";
import {
	generatePhotoKey,
	generatePhotoKeyByArr,
	StorageService,
} from "../../../storages/r2";
import { dbClient } from "..";
import {
	type Casting,
	castingDesigners,
	castings,
	collections,
	designers,
	type Release,
	releases,
	type UserCar,
	userCars,
} from "../schema";

type ReleaseWithDetails = Partial<Release> & {
	casting: {
		id: string;
		code: string;
		name: string;
		bodyType: string | null;
		firstYear: number | null;
		avatarUrl: string | null;
	} | null;
	collection: {
		id: number;
		code: string;
		name: string;
		wikiSlug: string | null;
	} | null;
	bookmark?: Partial<UserCar>;
};

export class CarsRepository {
	private db: DrizzleD1Database;
	private cache: CacheService;
	private storage: StorageService;
	private cloudinary: CloudinaryClient | null = null;
	private env: CloudflareBindings;

	constructor(env: CloudflareBindings) {
		this.env = env;
		this.db = dbClient(env.DB);
		this.cache = new CacheService(env.KV);
		this.storage = new StorageService(env);
	}

	private async getCloudinaryClient(): Promise<CloudinaryClient> {
		if (!this.cloudinary) {
			this.cloudinary = await createCloudinaryClient(this.env);
		}
		return this.cloudinary;
	}

	private buildReleasesQuery() {
		return sql`
SELECT
	r.id,
	r.year,
	r.color,
	r.tampo,
	r.wheel_type as wheelType,
	r.wheel_code as wheelCode,
	r.base_color as baseColor,
	r.base_type as baseType,
	r.interior_color as interiorColor,
	r.window_color as windowColor,
	r.mainline_number as mainlineNumber,
	r.sub_series_number as subSeriesNumber,
	r.case_code as caseCode,
	r.toy_index as toyIndex,
	r.country,
	r.avatar_url as avatarUrl,
	r.is_treasure_hunt as isTreasureHunt,
	r.is_super_treasure_hunt as isSuperTreasureHunt,
	r.wiki_slug as wikiSlug,
	r.wiki_url as wikiUrl,
	r.notes,
	r.created_at as createdAt,
	r.updated_at as updatedAt,
	c.id as casting_id,
	c.code as casting_code,
	c.name as casting_name,
	c.body_type as casting_bodyType,
	c.first_year as casting_firstYear,
	c.avatar_url as casting_avatarUrl,
	col.id as collection_id,
	col.code as collection_code,
	col.name as collection_name,
	col.wiki_slug as collection_wikiSlug
FROM ${releases} r
LEFT JOIN ${castings} c ON r.casting_id = c.id
LEFT JOIN ${collections} col ON r.collection_id = col.id`;
	}

	private mapToReleaseWithDetails(results: any[]): ReleaseWithDetails[] {
		return results.map((row) => ({
			id: row.id,
			year: row.year,
			color: row.color,
			tampo: row.tampo,
			wheelType: row.wheelType,
			wheelCode: row.wheelCode,
			baseColor: row.baseColor,
			baseType: row.baseType,
			interiorColor: row.interiorColor,
			windowColor: row.windowColor,
			mainlineNumber: row.mainlineNumber,
			subSeriesNumber: row.subSeriesNumber,
			caseCode: row.caseCode,
			toyIndex: row.toyIndex,
			country: row.country,
			avatarUrl: row.avatarUrl,
			isTreasureHunt: Boolean(row.isTreasureHunt),
			isSuperTreasureHunt: Boolean(row.isSuperTreasureHunt),
			wikiSlug: row.wikiSlug,
			wikiUrl: row.wikiUrl,
			notes: row.notes,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			casting: row.casting_id
				? {
						id: row.casting_id,
						code: row.casting_code,
						name: row.casting_name,
						bodyType: row.casting_bodyType,
						firstYear: row.casting_firstYear,
						avatarUrl: row.casting_avatarUrl,
					}
				: null,
			collection: row.collection_id
				? {
						id: row.collection_id,
						code: row.collection_code,
						name: row.collection_name,
						wikiSlug: row.collection_wikiSlug,
					}
				: null,
		}));
	}

	async responseWithBookmarks(
		response: {
			data: ReleaseWithDetails[];
			meta: { page: number; limit: number; total: number };
		},
		userId?: string,
	): Promise<{
		data: ReleaseWithDetails[];
		meta: { page: number; limit: number; total: number };
	}> {
		if (!userId) return response;
		if (response.data.length === 0) return response;

		const releaseIds = response.data
			.map((r) => r.id)
			.filter((id): id is string => id !== undefined);

		if (releaseIds.length === 0) return response;

		const bookmarks = await this.db
			.select()
			.from(userCars)
			.where(
				and(
					eq(userCars.userId, userId),
					inArray(userCars.releaseId, releaseIds),
				),
			)
			.all();

		const bookmarkMap = new Map(bookmarks.map((b) => [b.releaseId, b]));

		return {
			...response,
			data: response.data.map((r) => ({
				...r,
				bookmark: r.id ? bookmarkMap.get(r.id) : undefined,
			})),
		};
	}

	async paginateByUserId(
		userId: string,
		query: {
			q?: string;
			page: number;
			limit: number;
			sortBy?: string;
			sortOrder?: string;
			year?: string;
		},
	): Promise<{
		data: ReleaseWithDetails[];
		meta: { page: number; limit: number; total: number };
	}> {
		const { page, limit, sortBy, sortOrder, ...whereQueries } = query;
		const cacheKey = `user:${userId}:cars:${JSON.stringify({ page, limit, query })}`;

		const cached = await this.cache.get<{
			data: ReleaseWithDetails[];
			meta: { page: number; limit: number; total: number };
		}>(cacheKey);
		if (cached) {
			console.log("----> LOG [CACHE] user cars list found in cache!");
			return cached;
		}

		const offset = (page - 1) * limit;
		const conditions = [sql`uc.user_id = ${userId}`];

		if (whereQueries.q) {
			const searchPattern = `%${whereQueries.q}%`;
			conditions.push(
				sql`(c.name LIKE ${searchPattern} OR c.code LIKE ${searchPattern})`,
			);
		}
		if (whereQueries.year) {
			conditions.push(sql`r.year = ${whereQueries.year}`);
		}

		const hasFilters = conditions.length > 1;
		let total = 0;

		if (!hasFilters) {
			const countCacheKey = `user:${userId}:cars:total:count`;
			const cachedTotal = await this.cache.get<number>(countCacheKey);
			if (cachedTotal !== null) {
				console.log("----> LOG [CACHE] total user car count found in cache!");
				total = cachedTotal;
			} else {
				const countResult = await this.db.run(
					sql`SELECT COUNT(uc.id) as total FROM ${userCars} uc WHERE uc.user_id = ${userId}`,
				);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set(countCacheKey, total, 300);
			}
		} else {
			let countQuery = sql`
SELECT COUNT(uc.id) as total
FROM ${userCars} uc
INNER JOIN ${releases} r ON uc.release_id = r.id
INNER JOIN ${castings} c ON r.casting_id = c.id`;
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			const countResult = await this.db.run(countQuery);
			total = (countResult.results[0] as any)?.total || 0;
		}

		if (total === 0) {
			const emptyResponse = { data: [], meta: { page, limit, total: 0 } };
			await this.cache.set(cacheKey, emptyResponse, 300);
			return emptyResponse;
		}

		const columnMap: Record<string, string> = {
			name: "c.name",
			year: "r.year",
			color: "r.color",
			createdAt: "uc.created_at",
		};
		const orderColumn = sortBy || "createdAt";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "uc.created_at";

		let sqlQuery = sql`
SELECT
	r.id,
	r.year,
	r.color,
	r.tampo,
	r.wheel_type as wheelType,
	r.avatar_url as avatarUrl,
	r.is_treasure_hunt as isTreasureHunt,
	r.is_super_treasure_hunt as isSuperTreasureHunt,
	r.mainline_number as mainlineNumber,
	r.created_at as createdAt,
	r.updated_at as updatedAt,
	c.id as casting_id,
	c.code as casting_code,
	c.name as casting_name,
	c.avatar_url as casting_avatarUrl,
	col.id as collection_id,
	col.code as collection_code,
	col.name as collection_name,
	col.wiki_slug as collection_wikiSlug,
	uc.id as bookmark_id,
	uc.quantity as bookmark_quantity,
	uc.notes as bookmark_notes,
	uc.created_at as bookmark_createdAt,
	uc.updated_at as bookmark_updatedAt
FROM ${userCars} uc
INNER JOIN ${releases} r ON uc.release_id = r.id
LEFT JOIN ${castings} c ON r.casting_id = c.id
LEFT JOIN ${collections} col ON r.collection_id = col.id`;

		sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		const result = await this.db.run(sqlQuery);

		const data = (result.results as any[]).map((row) => ({
			id: row.id,
			year: row.year,
			color: row.color,
			tampo: row.tampo,
			wheelType: row.wheelType,
			avatarUrl: row.avatarUrl,
			isTreasureHunt: Boolean(row.isTreasureHunt),
			isSuperTreasureHunt: Boolean(row.isSuperTreasureHunt),
			mainlineNumber: row.mainlineNumber,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			casting: row.casting_id
				? {
						id: row.casting_id,
						code: row.casting_code,
						name: row.casting_name,
						bodyType: null,
						firstYear: null,
						avatarUrl: row.casting_avatarUrl,
					}
				: null,
			collection: row.collection_id
				? {
						id: row.collection_id,
						code: row.collection_code,
						name: row.collection_name,
						wikiSlug: row.collection_wikiSlug,
					}
				: null,
			bookmark: row.bookmark_id
				? {
						id: row.bookmark_id,
						userId,
						releaseId: row.id,
						quantity: row.bookmark_quantity,
						notes: row.bookmark_notes,
						createdAt: row.bookmark_createdAt,
						updatedAt: row.bookmark_updatedAt,
					}
				: undefined,
		}));

		const response = { data, meta: { page, limit, total } };
		await this.cache.set(cacheKey, response, 300);
		return response;
	}

	async paginateByCollectionId(
		collectionId: number,
		page: number,
		limit: number,
		query: {
			sortBy?: string;
			sortOrder?: string;
			q?: string;
			year?: string;
		},
		userId?: string,
	): Promise<{
		data: ReleaseWithDetails[];
		meta: { page: number; limit: number; total: number };
	}> {
		const cacheKey = `collection:${collectionId}:${JSON.stringify({ page, limit, query })}`;
		const { sortBy, sortOrder, ...whereQueries } = query;

		const cached = await this.cache.get<{
			data: ReleaseWithDetails[];
			meta: { page: number; limit: number; total: number };
		}>(cacheKey);
		if (cached) {
			console.log("----> LOG [CACHE] car collection list found in cache!");
			return this.responseWithBookmarks(cached, userId);
		}

		const offset = (page - 1) * limit;
		const conditions = [sql`r.collection_id = ${collectionId}`];

		if (whereQueries.q) {
			const searchPattern = `%${whereQueries.q}%`;
			conditions.push(
				sql`(c.name LIKE ${searchPattern} OR c.code LIKE ${searchPattern})`,
			);
		}
		if (whereQueries.year) {
			conditions.push(sql`r.year = ${whereQueries.year}`);
		}

		const hasFilters = conditions.length > 1;
		let total = 0;

		if (!hasFilters) {
			const countCacheKey = `collection:${collectionId}:total:count`;
			const cachedTotal = await this.cache.get<number>(countCacheKey);
			if (cachedTotal !== null) {
				console.log(
					"----> LOG [CACHE] total collection car count found in cache!",
				);
				total = cachedTotal;
			} else {
				const countResult = await this.db.run(
					sql`SELECT COUNT(r.id) as total FROM ${releases} r WHERE r.collection_id = ${collectionId}`,
				);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set(countCacheKey, total, 86_400 * 30);
			}
		} else {
			let countQuery = sql`
SELECT COUNT(r.id) as total
FROM ${releases} r
LEFT JOIN ${castings} c ON r.casting_id = c.id`;
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			const countResult = await this.db.run(countQuery);
			total = (countResult.results[0] as any)?.total || 0;
		}

		const columnMap: Record<string, string> = {
			name: "c.name",
			year: "r.year",
			color: "r.color",
			createdAt: "r.created_at",
		};
		const orderColumn = sortBy || "updated_at";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.name";

		let sqlQuery = this.buildReleasesQuery();
		sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		const result = await this.db.run(sqlQuery);
		const data = this.mapToReleaseWithDetails(result.results as any[]);
		const response = { data, meta: { page, limit, total } };
		await this.cache.set(cacheKey, response, 300);
		return this.responseWithBookmarks(response, userId);
	}

	async paginate(
		page: number,
		limit: number,
		query: {
			sortBy?: string;
			sortOrder?: string;
			q?: string;
			year?: string;
		},
		userId?: string,
	): Promise<{
		data: ReleaseWithDetails[];
		meta: { page: number; limit: number; total: number };
	}> {
		const cacheKey = `list:${JSON.stringify({ page, limit, query })}`;
		const { sortBy, sortOrder, ...whereQueries } = query;

		const cached = await this.cache.get<{
			data: ReleaseWithDetails[];
			meta: { page: number; limit: number; total: number };
		}>(cacheKey);
		if (cached && cached.data.length > 0) {
			console.log("----> LOG [CACHE] car list found in cache!");
			return this.responseWithBookmarks(cached, userId);
		}
		const offset = (page - 1) * limit;
		const conditions = [];

		if (whereQueries.q) {
			const searchPattern = `%${whereQueries.q}%`;
			conditions.push(
				sql`(c.name LIKE ${searchPattern} OR c.code LIKE ${searchPattern})`,
			);
		}
		if (whereQueries.year) {
			conditions.push(sql`r.year = ${whereQueries.year}`);
		}

		const hasFilters = conditions.length > 0;
		let total = 0;

		if (!hasFilters) {
			const cachedTotal = await this.cache.get<number>("cars:total:count");
			if (cachedTotal !== null && cachedTotal > 0) {
				console.log("----> LOG [CACHE] total car count found in cache!");
				total = cachedTotal;
			} else {
				const countResult = await this.db.run(
					sql`SELECT COUNT(r.id) as total FROM ${releases} r`,
				);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set("cars:total:count", total, 86_400 * 30);
			}
		} else {
			let countQuery = sql`
SELECT COUNT(r.id) as total
FROM ${releases} r
LEFT JOIN ${castings} c ON r.casting_id = c.id`;
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			const countResult = await this.db.run(countQuery);
			total = (countResult.results[0] as any)?.total || 0;
		}

		const columnMap: Record<string, string> = {
			name: "c.name",
			year: "r.year",
			color: "r.color",
			createdAt: "r.created_at",
		};
		const orderColumn = sortBy || "updated_at";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.name";

		let sqlQuery = this.buildReleasesQuery();
		if (hasFilters) {
			sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
		}
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		const result = await this.db.run(sqlQuery);
		const data = this.mapToReleaseWithDetails(result.results as any[]);
		const response = { data, meta: { page, limit, total } };
		await this.cache.set(cacheKey, response, 86_400);
		return this.responseWithBookmarks(response, userId);
	}

	async uploadImage(
		releaseId: string,
		image: {
			buffer: number[] | ArrayBuffer;
			filename: string;
			contentType: string;
		},
	): Promise<Release> {
		const release = await this.db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.get();

		if (!release) {
			throw new Error(`Release with id ${releaseId} not found`);
		}

		if (release.avatarUrl) {
			if (release.avatarUrl.startsWith("r2://")) {
				await this.storage.removeObject(release.avatarUrl);
			} else if (release.avatarUrl.includes("cloudinary.com")) {
				const cloudinaryClient = await this.getCloudinaryClient();
				const match = release.avatarUrl.match(
					/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/,
				);
				if (match) await cloudinaryClient.deleteImage(match[1]);
			}
		}

		const imageBuffer = Array.isArray(image.buffer)
			? new Uint8Array(image.buffer).buffer
			: image.buffer;

		const photoKey = generatePhotoKey(
			release.id,
			release.year?.toString() ?? "0",
			release.toyIndex ?? 0,
			image.filename,
		);

		await this.storage.uploadImageFromBinary(imageBuffer, photoKey);

		const cloudinaryClient = await this.getCloudinaryClient();
		const cloudinaryPublicId = CloudinaryClient.generatePhotoKey(
			release.id,
			release.year?.toString() ?? "0",
			release.toyIndex ?? 0,
		);

		const cloudinaryResult = await cloudinaryClient.uploadImageFromBuffer(
			imageBuffer,
			{ public_id: cloudinaryPublicId, folder: "releases", overwrite: true },
		);

		const [updated] = await this.db
			.update(releases)
			.set({ avatarUrl: cloudinaryResult.secure_url, updatedAt: new Date() })
			.where(eq(releases.id, releaseId))
			.returning();

		return updated;
	}

	async removeImage(releaseId: string): Promise<Release> {
		const release = await this.db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.get();

		if (!release) {
			throw new Error(`Release with id ${releaseId} not found`);
		}

		if (release.avatarUrl) {
			if (release.avatarUrl.startsWith("r2://")) {
				await this.storage.removeObject(release.avatarUrl);
			} else if (release.avatarUrl.includes("cloudinary.com")) {
				const cloudinaryClient = await this.getCloudinaryClient();
				const match = release.avatarUrl.match(
					/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/,
				);
				if (match) await cloudinaryClient.deleteImage(match[1]);
			}
		}

		const [updated] = await this.db
			.update(releases)
			.set({ avatarUrl: null, updatedAt: new Date() })
			.where(eq(releases.id, releaseId))
			.returning();

		return updated;
	}

	// Pulls casting + designer data from Fandom wiki and syncs it to the DB.
	async sync(castingId: string): Promise<Casting> {
		const casting = await this.db
			.select()
			.from(castings)
			.where(eq(castings.id, castingId))
			.get();

		if (!casting) {
			throw new Error(`Casting with id ${castingId} not found`);
		}

		const wikiSlug = casting.wikiSlug ?? generateSlug(casting.name);
		const provider = new FandomProvider(this.env);
		const wikiCar = await provider.getCar(wikiSlug);

		// -- upsert designer
		let designer = await this.db
			.select()
			.from(designers)
			.where(eq(designers.wikiSlug, wikiCar.designer.slug))
			.get();

		if (!designer) {
			const [inserted] = await this.db
				.insert(designers)
				.values({
					name: wikiCar.designer.name,
					wikiSlug: wikiCar.designer.slug,
				})
				.returning();
			designer = inserted;
			console.log("----> LOG [CASTING:SYNC] designer inserted!", designer);
		}

		// -- link designer to casting if not already linked
		const existingLink = await this.db
			.select()
			.from(castingDesigners)
			.where(
				and(
					eq(castingDesigners.castingId, castingId),
					eq(castingDesigners.designerId, designer.id),
				),
			)
			.get();

		if (!existingLink) {
			await this.db
				.insert(castingDesigners)
				.values({ castingId, designerId: designer.id, role: "lead" });
		}

		// -- upload images
		const imgs: string[] = [];
		for (let i = 0; i < wikiCar.photo_url.length; i++) {
			imgs.push(
				await this.storage.uploadImageFromUrl(
					wikiCar.photo_url[i],
					generatePhotoKeyByArr([
						wikiCar?.model?.code || "unknown",
						"avatars",
						`img-${i.toString()}`,
					]),
				),
			);
		}

		// -- update casting record
		const [updated] = await this.db
			.update(castings)
			.set({
				name: wikiCar.model.name,
				avatarUrl: imgs[0] ?? casting.avatarUrl,
				wikiSlug: wikiCar.model.slug,
				code: wikiCar.model.code,
				updatedAt: new Date(),
			})
			.where(eq(castings.id, castingId))
			.returning();

		console.log("----> LOG [CASTING:SYNC] casting updated!", updated);
		return updated;
	}
}
