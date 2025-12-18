import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type NewSeries, type Series, series } from "../schema";

export class SeriesRepository {
	constructor(private db: DrizzleD1Database) {}

	async upsert(
		data: Omit<NewSeries, "id" | "createdAt" | "updatedAt">,
	): Promise<Series> {
		const [result] = await this.db
			.insert(series)
			.values(data)
			.onConflictDoUpdate({
				target: series.name,
				set: {
					...data,
					updatedAt: new Date(),
				},
			})
			.returning();
		return result;
	}

	async findByName(name: string): Promise<Series | undefined> {
		return await this.db
			.select()
			.from(series)
			.where(eq(series.name, name))
			.get();
	}

	async findById(id: string): Promise<Series | undefined> {
		return await this.db.select().from(series).where(eq(series.id, id)).get();
	}

	async getAll(): Promise<Series[]> {
		return await this.db.select().from(series).all();
	}
}
