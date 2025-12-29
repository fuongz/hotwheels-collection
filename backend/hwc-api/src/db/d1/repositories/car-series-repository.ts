import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type CarSeries, carSeries, type NewCarSeries } from "../schema";

export class CarSeriesRepository {
	constructor(private db: DrizzleD1Database) {}

	async create(
		data: Omit<NewCarSeries, "id" | "createdAt" | "updatedAt">,
	): Promise<CarSeries> {
		const [created] = await this.db.insert(carSeries).values(data).returning();
		return created;
	}

	async upsert(
		data: Omit<NewCarSeries, "id" | "createdAt" | "updatedAt">,
	): Promise<CarSeries> {
		const existing = await this.db
			.select()
			.from(carSeries)
			.where(
				and(
					eq(carSeries.carVersionId, data.carVersionId),
					eq(carSeries.seriesId, data.seriesId),
				),
			)
			.get();

		if (existing) {
			const [updated] = await this.db
				.update(carSeries)
				.set({
					...data,
					updatedAt: new Date(),
				})
				.where(eq(carSeries.id, existing.id))
				.returning();
			return updated;
		}

		return await this.create(data);
	}

	async findByCarId(carVersionId: string): Promise<CarSeries[]> {
		return await this.db
			.select()
			.from(carSeries)
			.where(eq(carSeries.carVersionId, carVersionId))
			.all();
	}

	async findBySeriesId(seriesId: string): Promise<CarSeries[]> {
		return await this.db
			.select()
			.from(carSeries)
			.where(eq(carSeries.seriesId, seriesId))
			.all();
	}

	async getAll(): Promise<CarSeries[]> {
		return await this.db.select().from(carSeries).all();
	}

	async deleteByCarId(carVersionId: string): Promise<void> {
		await this.db
			.delete(carSeries)
			.where(eq(carSeries.carVersionId, carVersionId));
	}

	async deleteByCarAndSeries(
		carVersionId: string,
		seriesId: string,
	): Promise<void> {
		await this.db
			.delete(carSeries)
			.where(
				and(
					eq(carSeries.carVersionId, carVersionId),
					eq(carSeries.seriesId, seriesId),
				),
			);
	}
}
