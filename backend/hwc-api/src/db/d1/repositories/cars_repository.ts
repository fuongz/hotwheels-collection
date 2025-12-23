import { and, eq, inArray, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { CacheService } from "../../../cache/kv/cache.service";
import { dbClient } from "..";
import {
	type Car,
	carSeries,
	cars,
	type NewCar,
	type Series,
	series,
	type UserCar,
	userCars,
} from "../schema";

type CarWithSeries = Partial<Car> & {
	series: Partial<Series>[];
	bookmark?: Partial<UserCar>;
};

export class CarsRepository {
	private db: DrizzleD1Database;
	private cache: CacheService;

	constructor(env: CloudflareBindings) {
		this.db = dbClient(env.DB);
		this.cache = new CacheService(env.KV);
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
FROM ${cars} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_id
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
		data: Omit<NewCar, "id" | "createdAt" | "updatedAt">,
	): Promise<Car> {
		const existing = await this.db
			.select()
			.from(cars)
			.where(eq(cars.toyCode, data.toyCode))
			.get();

		if (existing) {
			const [updated] = await this.db
				.update(cars)
				.set({
					...data,
					updatedAt: new Date(),
				})
				.where(eq(cars.id, existing.id))
				.returning();
			return updated;
		}
		const [created] = await this.db.insert(cars).values(data).returning();
		return created;
	}

	async findByYear(year: string): Promise<Car[]> {
		return await this.db.select().from(cars).where(eq(cars.year, year)).all();
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
		const carIds = response.data
			.map((car) => car.id)
			.filter((id): id is string => id !== undefined);

		// -- if no valid car IDs, return response as-is
		if (carIds.length === 0) {
			return response;
		}

		// -- query user_cars table for bookmarks
		const bookmarks = await this.db
			.select()
			.from(userCars)
			.where(and(eq(userCars.userId, userId), inArray(userCars.carId, carIds)))
			.all();

		// -- create a map for quick lookup: carId -> UserCar
		const bookmarkMap = new Map(
			bookmarks.map((bookmark) => [bookmark.carId, bookmark]),
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
FROM ${cars} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_id
WHERE cc.series_id = ${collectionId}`;
				const countResult = await this.db.run(countQuery);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set(countCacheKey, total, 86_400 * 30); // Cache for 1 day
			}
		} else {
			// -- with filters, always query the count
			let countQuery = sql`
SELECT COUNT(c.id) as total
FROM ${cars} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_id`;
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
				const countQuery = sql`SELECT COUNT(c.id) as total FROM ${cars} c`;
				const countResult = await this.db.run(countQuery);
				total = (countResult.results[0] as any)?.total || 0;
				await this.cache.set("cars:total:count", total, 86_400 * 30); // Cache for 1 day
			}
		} else {
			// -- with filters, always query the count
			let countQuery = sql`SELECT COUNT(c.id) as total FROM ${cars} c`;
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
}
