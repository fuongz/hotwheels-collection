import { eq, sql } from "drizzle-orm";
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
} from "../schema";

type CarWithSeries = Partial<Car> & {
	series: Partial<Series>[];
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
			return cached;
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

		// -- count query
		let countQuery = sql`
SELECT COUNT(DISTINCT c.id) as total
FROM ${cars} c
LEFT JOIN ${carSeries} cc ON c.id = cc.car_id`;

		// -- data query
		let sqlQuery = this.buildCarsWithSeriesQuery();

		// -- apply conditions
		countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
		sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;

		// -- group by
		sqlQuery = sql`${sqlQuery} GROUP BY c.id, c.model, c.created_at, c.updated_at`;

		// -- map column names to SQL column references
		const columnMap: Record<string, string> = {
			model: "c.model",
			year: "c.year",
			toyCode: "c.toy_code",
			toyIndex: "c.toy_index",
			createdAt: "c.created_at",
			updatedAt: "c.updated_at",
		};

		const orderColumn = sortBy || "updated_at";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.model";

		// -- apply order by, use from `sortBy` and `sortOrder` query params
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;

		// -- apply limit and offset, use from `page` and `limit` query params
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		// -- execute both queries: one for count and one for data
		const [countResult, result] = await Promise.all([
			this.db.run(countQuery),
			this.db.run(sqlQuery),
		]);

		const total = (countResult.results[0] as any)?.total || 0;
		const carsWithSeries = this.mapToCarWithSeries(result.results as any[]);
		const response = {
			data: carsWithSeries,
			meta: { page, limit, total },
		};
		await this.cache.set(cacheKey, response, 300);
		return response;
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
		console.log("----> LOG [CACHE] car list found in cache!");
		if (cached) return cached;
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

		// -- count query
		let countQuery = sql`
SELECT COUNT(DISTINCT c.id) as total
FROM ${cars} c`;

		// -- data query
		let sqlQuery = this.buildCarsWithSeriesQuery();

		// -- apply conditions
		if (conditions.length > 0) {
			countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
			sqlQuery = sql`${sqlQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
		}

		// -- group by
		sqlQuery = sql`${sqlQuery} GROUP BY c.id, c.model, c.created_at, c.updated_at`;

		// -- map column names to SQL column references
		const columnMap: Record<string, string> = {
			model: "c.model",
			year: "c.year",
			toyCode: "c.toy_code",
			toyIndex: "c.toy_index",
			createdAt: "c.created_at",
			updatedAt: "c.updated_at",
		};

		const orderColumn = sortBy || "updated_at";
		const orderDirection = (sortOrder || "desc").toUpperCase();
		const sqlColumn = columnMap[orderColumn] || "c.model";

		// -- apply order by, use from `sortBy` and `sortOrder` query params
		sqlQuery = sql`${sqlQuery} ORDER BY ${sql.raw(sqlColumn)} ${sql.raw(orderDirection)}`;

		// -- apply limit and offset, use from `page` and `limit` query params
		sqlQuery = sql`${sqlQuery} LIMIT ${sql.raw(limit.toString())} OFFSET ${sql.raw(offset.toString())}`;

		// -- execute both queries: one for count and one for data
		const [countResult, result] = await Promise.all([
			this.db.run(countQuery),
			this.db.run(sqlQuery),
		]);

		const total = (countResult.results[0] as any)?.total || 0;
		const carsWithSeries = this.mapToCarWithSeries(result.results as any[]);
		const response = {
			data: carsWithSeries,
			meta: { page, limit, total },
		};
		await this.cache.set(cacheKey, response, 300);
		return response;
	}
}
