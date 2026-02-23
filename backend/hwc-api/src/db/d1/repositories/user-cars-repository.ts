import { and, eq, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { dbClient } from "..";
import { type NewUserCar, type UserCar, userCars } from "../schema";

export class UserCarsRepository {
	private db: DrizzleD1Database;

	constructor(env: CloudflareBindings) {
		this.db = dbClient(env.DB);
	}

	async findByUserIdAndReleaseId(
		userId: string,
		releaseId: string,
	): Promise<UserCar | undefined> {
		return await this.db
			.select()
			.from(userCars)
			.where(
				and(
					eq(userCars.userId, userId),
					eq(userCars.releaseId, releaseId),
				),
			)
			.get();
	}

	async findByUserIdAndReleaseIds(
		userId: string,
		releaseIds: string[],
	): Promise<UserCar[]> {
		return await this.db
			.select()
			.from(userCars)
			.where(
				and(
					eq(userCars.userId, userId),
					inArray(userCars.releaseId, releaseIds),
				),
			)
			.all();
	}

	async upsert(
		data: Omit<NewUserCar, "id" | "createdAt" | "updatedAt">,
	): Promise<UserCar> {
		const existing = await this.findByUserIdAndReleaseId(
			data.userId,
			data.releaseId,
		);
		if (existing) {
			const [updated] = await this.db
				.update(userCars)
				.set({
					quantity: data.quantity,
					notes: data.notes,
					updatedAt: new Date(),
				})
				.where(eq(userCars.id, existing.id))
				.returning();
			return updated;
		}
		const [created] = await this.db.insert(userCars).values(data).returning();
		return created;
	}

	async delete(userId: string, releaseId: string): Promise<void> {
		await this.db
			.delete(userCars)
			.where(
				and(
					eq(userCars.userId, userId),
					eq(userCars.releaseId, releaseId),
				),
			);
	}

	async findByUserId(userId: string): Promise<UserCar[]> {
		return await this.db
			.select()
			.from(userCars)
			.where(eq(userCars.userId, userId))
			.all();
	}
}
