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
					eq(carSeries.carId, data.carId),
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

	async findByCarId(carId: string): Promise<CarSeries[]> {
		return await this.db
			.select()
			.from(carSeries)
			.where(eq(carSeries.carId, carId))
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

	async deleteByCarId(carId: string): Promise<void> {
		await this.db.delete(carSeries).where(eq(carSeries.carId, carId));
	}

	async deleteByCarAndSeries(
		carId: string,
		seriesId: string,
	): Promise<void> {
		await this.db
			.delete(carSeries)
			.where(
				and(eq(carSeries.carId, carId), eq(carSeries.seriesId, seriesId)),
			);
	}
}
