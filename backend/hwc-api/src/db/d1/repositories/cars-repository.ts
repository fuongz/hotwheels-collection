import { and, eq, inArray, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { CacheService } from "../../../cache/kv/cache.service";
import { FandomProvider, generateSlug } from "../../../providers/fandom";
import {
	CloudinaryClient,
	createCloudinaryClient,
} from "../../../storages/cloudinary";
import { generatePhotoKey, StorageService } from "../../../storages/r2";
import { dbClient } from "..";
import {
	type CarVersion,
	carSeries,
	carVersions,
	type NewCarVersion,
	type Series,
	series,
	type UserCar,
	userCars,
} from "../schema";

type CarWithSeries = Partial<CarVersion> & {
	series: Partial<Series>[];
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

	private buildCarsWithSeriesQuery() {
		return sql`
SELECT
	c.id,
	c.model,
	c.year,
	c.wiki_slug as wikiSlug,
	c.toy_code as toyCode,
	c.toy_index as toyIndex,
	c.avatar_url as avatarUrl,
	c.created_at as createdAt,
	c.updated_at as updatedAt,
	COALESCE(
		json_group_array(
			CASE
			WHEN col.id IS NOT NULL
			THEN json_object(
				'id', col.id,
				'name', col.name,
				'wikiSlug', col.wiki_slug,
				'seriesNum', col.series_num,
				'createdAt', col.created_at,
				'updatedAt', col.updated_at
			)
			END
		) FILTER (WHERE col.id IS NOT NULL),
		json_array()
	) as series
FROM ${carVersions} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_version_id
LEFT JOIN ${series} col ON cc.series_id = col.id`;
	}

	private mapToCarWithSeries(results: any[]): CarWithSeries[] {
		return results.map((row) => ({
			id: row.id,
			model: row.model,
			year: row.year,
			toyCode: row.toyCode,
			toyIndex: row.toyIndex,
			avatarUrl: row.avatarUrl,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			series: JSON.parse(row.series).map((col: any) => ({
				...col,
				createdAt: col.createdAt,
			})),
		}));
	}

	async upsert(
		data: Omit<NewCarVersion, "id" | "createdAt" | "updatedAt">,
	): Promise<CarVersion> {
		const existing = await this.db
			.select()
			.from(carVersions)
			.where(eq(carVersions.toyCode, data.toyCode))
			.get();

		if (existing) {
			const [updated] = await this.db
				.update(carVersions)
				.set({
					...data,
					updatedAt: new Date(),
				})
				.where(eq(carVersions.id, existing.id))
				.returning();
			return updated;
		}
		const [created] = await this.db
			.insert(carVersions)
			.values(data)
			.returning();
		return created;
	}

	async responseWithBookmarks(
		response: {
			data: CarWithSeries[];
			meta: { page: number; limit: number; total: number };
		},
		userId?: string,
	): Promise<{
		data: CarWithSeries[];
		meta: { page: number; limit: number; total: number };
	}> {
		// -- if no userId provided, return response as-is
		if (!userId) {
			return response;
		}

		// -- if no data, return response as-is
		if (response.data.length === 0) {
			return response;
		}

		// -- extract car IDs from the response
		const carVersionIds = response.data
			.map((car) => car.id)
			.filter((id): id is string => id !== undefined);

		// -- if no valid car IDs, return response as-is
		if (carVersionIds.length === 0) {
			return response;
		}

		// -- query user_cars table for bookmarks
		const bookmarks = await this.db
			.select()
			.from(userCars)
			.where(
				and(
					eq(userCars.userId, userId),
					inArray(userCars.carVersionId, carVersionIds),
				),
			)
			.all();

		// -- create a map for quick lookup: carVersionId -> UserCar
		const bookmarkMap = new Map(
			bookmarks.map((bookmark) => [bookmark.carVersionId, bookmark]),
		);

		// -- attach bookmarks to each car
		const dataWithBookmarks = response.data.map((car) => ({
			...car,
			bookmark: car.id ? bookmarkMap.get(car.id) : undefined,
		}));

		return {
			...response,
			data: dataWithBookmarks,
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
		data: CarWithSeries[];
		meta: { page: number; limit: number; total: number };
	}> {
		const { page, limit, sortBy, sortOrder, ...whereQueries } = query;
		const cacheKey = `user:${userId}:cars:${JSON.stringify({ page, limit, query })}`;

		// --------------------
		// -- check cache first
		const cached = await this.cache.get<{
			data: CarWithSeries[];
			meta: { page: number; limit: number; total: number };
		}>(cacheKey);

		// -- return cache
		if (cached) {
			console.log("----> LOG [CACHE] user cars list found in cache!");
			return cached;
		}
		// --------------------

		const offset = (page - 1) * limit;
		const conditions = [sql`uc.user_id = ${userId}`];

		// Apply filters
		if (whereQueries.q) {
			const searchPattern = `%${whereQueries.q}%`;
			conditions.push(
				sql`(c.model LIKE ${searchPattern} OR c.toy_code LIKE ${searchPattern})`,
			);
		}
		if (whereQueries.year) {
			conditions.push(sql`c.year = ${whereQueries.year}`);
		}

		// -- check if we have filters (excluding the userId condition)
		const hasFilters = conditions.length > 1;

		// -- count total (with cache for unfiltered queries)
		let total = 0;
		if (!hasFilters) {
			// -- try to get cached total count for this user
			const countCacheKey = `user:${userId}:cars:total:count`;
			const cachedTotal = await this.cache.get<number>(countCacheKey);
			if (cachedTotal !== null) {
				console.log("----> LOG [CACHE] total user car count found in cache!");
				total = cachedTotal;
			} else {
				// -- fetch and cache total count for this user
				const countQuery = sql`
SELECT COUNT(uc.id) as total
FROM ${userCars} uc
WHERE uc.user_id = ${userId}`;

				const countResult = await this.db.run(countQuery);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set(countCacheKey, total, 300);
			}
		} else {
			// -- with filters, always query the count
			let countQuery = sql`
SELECT COUNT(uc.id) as total
FROM ${userCars} uc
INNER JOIN ${carVersions} c ON uc.car_version_id = c.id`;
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			const countResult = await this.db.run(countQuery);
			total = (countResult.results[0] as any)?.total || 0;
		}

		// -- if no results, return early
		if (total === 0) {
			const emptyResponse = {
				data: [],
				meta: { page, limit, total: 0 },
			};
			await this.cache.set(cacheKey, emptyResponse, 300);
			return emptyResponse;
		}

		// --------------------
		// Solution 1: Single Query Approach
		// Combines user_cars + cars + series in one query
		// --------------------
		let sqlQuery = sql`
SELECT
	c.id,
	c.model,
	c.year,
	c.wiki_slug as wikiSlug,
	c.toy_code as toyCode,
	c.toy_index as toyIndex,
	c.avatar_url as avatarUrl,
	c.created_at as createdAt,
	c.updated_at as updatedAt,
	uc.id as bookmark_id,
	uc.quantity as bookmark_quantity,
	uc.notes as bookmark_notes,
	uc.created_at as bookmark_createdAt,
	uc.updated_at as bookmark_updatedAt,
	COALESCE(
		json_group_array(
			CASE
			WHEN col.id IS NOT NULL
			THEN json_object(
				'id', col.id,
				'name', col.name,
				'wikiSlug', col.wiki_slug,
				'seriesNum', col.series_num,
				'createdAt', col.created_at,
				'updatedAt', col.updated_at
			)
			END
		) FILTER (WHERE col.id IS NOT NULL),
		json_array()
	) as series
FROM ${userCars} uc
INNER JOIN ${carVersions} c ON uc.car_version_id = c.id
LEFT JOIN ${carSeries} cc ON c.id = cc.car_version_id
LEFT JOIN ${series} col ON cc.series_id = col.id`;

		// -- apply conditions
		sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;

		// -- group by
		sqlQuery = sql`${sqlQuery} GROUP BY c.id, uc.id`;

		// -- map column names to SQL column references
		const columnMap: Record<string, string> = {
			model: "c.model",
			year: "c.year",
			createdAt: "c.created_at",
		};

		const orderColumn = sortBy || "createdAt";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.created_at";

		// -- apply order by
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;

		// -- apply limit and offset
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		// -- execute query
		const result = await this.db.run(sqlQuery);

		if (!result.results || result.results.length === 0) {
			const emptyResponse = {
				data: [],
				meta: { page, limit, total },
			};
			await this.cache.set(cacheKey, emptyResponse, 300);
			return emptyResponse;
		}

		// -- map results including bookmark data
		const carsWithSeries = result.results.map((row: any) => ({
			id: row.id,
			model: row.model,
			year: row.year,
			toyCode: row.toyCode,
			toyIndex: row.toyIndex,
			avatarUrl: row.avatarUrl,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			series: JSON.parse(row.series).map((col: any) => ({
				...col,
				createdAt: col.createdAt,
			})),
			bookmark: row.bookmark_id
				? {
						id: row.bookmark_id,
						userId: userId,
						carVersionId: row.id,
						quantity: row.bookmark_quantity,
						notes: row.bookmark_notes,
						createdAt: row.bookmark_createdAt,
						updatedAt: row.bookmark_updatedAt,
					}
				: undefined,
		}));

		const response = {
			data: carsWithSeries,
			meta: { page, limit, total },
		};

		// -- cache the response
		await this.cache.set(cacheKey, response, 300); // Cache for 5 minutes
		return response;
	}

	async paginateByCollectionId(
		collectionId: string,
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
		data: CarWithSeries[];
		meta: { page: number; limit: number; total: number };
	}> {
		const cacheKey = `collection:${collectionId}:${JSON.stringify({ page, limit, query })}`;
		const { sortBy, sortOrder, ...whereQueries } = query;

		// --------------------
		// -- check cache first
		const cached = await this.cache.get<{
			data: CarWithSeries[];
			meta: { page: number; limit: number; total: number };
		}>(cacheKey);

		// -- return cache
		if (cached) {
			console.log("----> LOG [CACHE] car collection list found in cache!");
			return this.responseWithBookmarks(cached, userId);
		}
		// --------------------

		const offset = (page - 1) * limit;
		const conditions = [sql`cc.series_id = ${collectionId}`];

		// -- where queries
		if (whereQueries.q) {
			const searchPattern = `%${whereQueries.q}%`;
			conditions.push(
				sql`(c.model LIKE ${searchPattern} OR c.toy_code LIKE ${searchPattern})`,
			);
		}
		if (whereQueries.year) {
			conditions.push(sql`c.year = ${whereQueries.year}`);
		}

		// -- check if we have filters (excluding the collectionId condition)
		const hasFilters = conditions.length > 1;

		// -- count total (with cache for unfiltered queries)
		let total = 0;
		if (!hasFilters) {
			// -- try to get cached total count for this collection
			const countCacheKey = `collection:${collectionId}:total:count`;
			const cachedTotal = await this.cache.get<number>(countCacheKey);
			if (cachedTotal !== null) {
				console.log(
					"----> LOG [CACHE] total collection car count found in cache!",
				);
				total = cachedTotal;
			} else {
				// -- fetch and cache total count for this collection
				const countQuery = sql`
SELECT COUNT(c.id) as total
FROM ${carVersions} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_version_id
WHERE cc.series_id = ${collectionId}`;
				const countResult = await this.db.run(countQuery);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set(countCacheKey, total, 86_400 * 30); // Cache for 1 day
			}
		} else {
			// -- with filters, always query the count
			let countQuery = sql`
SELECT COUNT(c.id) as total
FROM ${carVersions} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_version_id`;
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			const countResult = await this.db.run(countQuery);
			total = (countResult.results[0] as any)?.total || 0;
		}

		// -- data query
		let sqlQuery = this.buildCarsWithSeriesQuery();

		// -- apply conditions
		sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;

		// -- group by
		sqlQuery = sql`${sqlQuery} GROUP BY c.id, c.model, c.created_at, c.updated_at`;

		// -- map column names to SQL column references
		const columnMap: Record<string, string> = {
			model: "c.model",
			year: "c.year",
			createdAt: "c.created_at",
		};

		const orderColumn = sortBy || "updated_at";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.model";

		// -- apply order by, use from `sortBy` and `sortOrder` query params
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;

		// -- apply limit and offset, use from `page` and `limit` query params
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		// -- execute data query
		const result = await this.db.run(sqlQuery);

		const carsWithSeries = this.mapToCarWithSeries(result.results as any[]);
		const response = {
			data: carsWithSeries,
			meta: { page, limit, total },
		};
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
		data: CarWithSeries[];
		meta: { page: number; limit: number; total: number };
	}> {
		const cacheKey = `list:${JSON.stringify({ page, limit, query })}`;
		const { sortBy, sortOrder, ...whereQueries } = query;

		// --------------------
		// -- check cache first
		const cached = await this.cache.get<{
			data: CarWithSeries[];
			meta: { page: number; limit: number; total: number };
		}>(cacheKey);

		// -- return cache
		if (cached) {
			console.log("----> LOG [CACHE] car list found in cache!");
			return this.responseWithBookmarks(cached, userId);
		}
		// --------------------

		const offset = (page - 1) * limit;
		const conditions = [];

		// -- where queries
		if (whereQueries.q) {
			const searchPattern = `%${whereQueries.q}%`;
			conditions.push(
				sql`(c.model LIKE ${searchPattern} OR c.toy_code LIKE ${searchPattern})`,
			);
		}
		if (whereQueries.year) {
			conditions.push(sql`c.year = ${whereQueries.year}`);
		}

		// -- check if we have filters
		const hasFilters = conditions.length > 0;

		// -- count total (with cache for unfiltered queries)
		let total = 0;
		if (!hasFilters) {
			// -- try to get cached total count
			const cachedTotal = await this.cache.get<number>("cars:total:count");
			if (cachedTotal !== null) {
				console.log("----> LOG [CACHE] total car count found in cache!");
				total = cachedTotal;
			} else {
				// -- fetch and cache total count
				const countQuery = sql`SELECT COUNT(c.id) as total FROM ${carVersions} c`;
				const countResult = await this.db.run(countQuery);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set("cars:total:count", total, 86_400 * 30); // Cache for 1 day
			}
		} else {
			// -- with filters, always query the count
			let countQuery = sql`SELECT COUNT(c.id) as total FROM ${carVersions} c`;
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			const countResult = await this.db.run(countQuery);
			total = (countResult.results[0] as any)?.total || 0;
		}

		// -- data query
		let sqlQuery = this.buildCarsWithSeriesQuery();

		// -- apply conditions
		if (hasFilters) {
			sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
		}

		// -- group by
		sqlQuery = sql`${sqlQuery} GROUP BY c.id, c.model, c.created_at, c.updated_at`;

		// -- map column names to SQL column references
		const columnMap: Record<string, string> = {
			model: "c.model",
			year: "c.year",
			createdAt: "c.created_at",
		};

		const orderColumn = sortBy || "updated_at";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.model";

		// -- apply order by, use from `sortBy` and `sortOrder` query params
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;

		// -- apply limit and offset, use from `page` and `limit` query params
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		// -- execute data query
		const result = await this.db.run(sqlQuery);

		const carsWithSeries = this.mapToCarWithSeries(result.results as any[]);
		const response = {
			data: carsWithSeries,
			meta: { page, limit, total },
		};
		await this.cache.set(cacheKey, response, 86_400);
		return this.responseWithBookmarks(response, userId);
	}

	async uploadImage(
		carVersionId: string,
		image: {
			buffer: number[] | ArrayBuffer;
			filename: string;
			contentType: string;
		},
	): Promise<CarVersion> {
		// -- get the car to generate proper photo key
		const car = await this.db
			.select()
			.from(carVersions)
			.where(eq(carVersions.id, carVersionId))
			.get();

		if (!car) {
			throw new Error(`Car with id ${carVersionId} not found`);
		}

		// -- if car already has an avatarUrl, delete the old image from both storages
		if (car.avatarUrl) {
			if (car.avatarUrl.startsWith("r2://")) {
				await this.storage.removeObject(car.avatarUrl);
			} else if (car.avatarUrl.includes("cloudinary.com")) {
				// Extract public_id from Cloudinary URL and delete
				const cloudinaryClient = await this.getCloudinaryClient();
				const match = car.avatarUrl.match(
					/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/,
				);
				if (match) {
					await cloudinaryClient.deleteImage(match[1]);
				}
			}
		}

		// -- convert buffer from number array to ArrayBuffer if needed
		const imageBuffer = Array.isArray(image.buffer)
			? new Uint8Array(image.buffer).buffer
			: image.buffer;

		// -- generate photo key using car details and original filename
		const photoKey = generatePhotoKey(
			car.toyCode,
			car.year.toString(),
			0,
			image.filename,
		);

		// -- upload image to R2 for backup
		await this.storage.uploadImageFromBinary(imageBuffer, photoKey);

		// -- upload image to Cloudinary
		const cloudinaryClient = await this.getCloudinaryClient();
		const cloudinaryPublicId = CloudinaryClient.generatePhotoKey(
			car.toyCode,
			car.year.toString(),
			0,
		);

		const cloudinaryResult = await cloudinaryClient.uploadImageFromBuffer(
			imageBuffer,
			{
				public_id: cloudinaryPublicId,
				folder: "cars",
				overwrite: true,
			},
		);

		// -- update the car with Cloudinary URL and updatedAt
		const [updated] = await this.db
			.update(carVersions)
			.set({
				avatarUrl: cloudinaryResult.secure_url,
				updatedAt: new Date(),
			})
			.where(eq(carVersions.id, carVersionId))
			.returning();

		return updated;
	}

	async removeImage(carVersionId: string): Promise<CarVersion> {
		// -- get the car to check if it has an avatar
		const car = await this.db
			.select()
			.from(carVersions)
			.where(eq(carVersions.id, carVersionId))
			.get();

		if (!car) {
			throw new Error(`Car with id ${carVersionId} not found`);
		}

		// -- if car has an avatarUrl, delete from storage
		if (car.avatarUrl) {
			if (car.avatarUrl.startsWith("r2://")) {
				await this.storage.removeObject(car.avatarUrl);
			} else if (car.avatarUrl.includes("cloudinary.com")) {
				// Extract public_id from Cloudinary URL and delete
				const cloudinaryClient = await this.getCloudinaryClient();
				const match = car.avatarUrl.match(
					/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/,
				);
				if (match) {
					await cloudinaryClient.deleteImage(match[1]);
				}
			}
		}

		// -- update the car to set avatarUrl to null
		const [updated] = await this.db
			.update(carVersions)
			.set({
				avatarUrl: null,
				updatedAt: new Date(),
			})
			.where(eq(carVersions.id, carVersionId))
			.returning();

		return updated;
	}

	async sync(carVersionId: string): Promise<CarVersion> {
		// -- get the car to check if it has an avatar
		const car = await this.db
			.select()
			.from(carVersions)
			.where(eq(carVersions.id, carVersionId))
			.get();

		if (!car) {
			throw new Error(`Car with id ${carVersionId} not found`);
		}

		if (!car.wikiSlug && car.model.endsWith("(2nd Color)")) {
			throw new Error(`This car currently does not support wiki syncing.`);
		}

		// -- wiki slug
		const wikiSlug = car.wikiSlug ? car.wikiSlug : generateSlug(car.model);

		const provider = new FandomProvider(this.env);
		const wikiCar = await provider.getCar(wikiSlug);

		return wikiCar;
	}
}
