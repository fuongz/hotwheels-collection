import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
	type NewReleaseExclusive,
	type ReleaseExclusive,
	releaseExclusives,
} from "../schema";

export class ReleaseExclusivesRepository {
	constructor(private db: DrizzleD1Database) {}

	async create(
		data: Omit<NewReleaseExclusive, "id">,
	): Promise<ReleaseExclusive> {
		const [created] = await this.db
			.insert(releaseExclusives)
			.values(data)
			.returning();
		return created;
	}

	async upsert(
		data: Omit<NewReleaseExclusive, "id">,
	): Promise<ReleaseExclusive> {
		const existing = await this.db
			.select()
			.from(releaseExclusives)
			.where(
				and(
					eq(releaseExclusives.releaseId, data.releaseId),
					eq(releaseExclusives.exclusiveProgramId, data.exclusiveProgramId),
				),
			)
			.get();

		if (existing) {
			const [updated] = await this.db
				.update(releaseExclusives)
				.set({ ...data })
				.where(eq(releaseExclusives.id, existing.id))
				.returning();
			return updated;
		}

		return await this.create(data);
	}

	async findByReleaseId(releaseId: string): Promise<ReleaseExclusive[]> {
		return await this.db
			.select()
			.from(releaseExclusives)
			.where(eq(releaseExclusives.releaseId, releaseId))
			.all();
	}

	async findByExclusiveProgramId(
		exclusiveProgramId: string,
	): Promise<ReleaseExclusive[]> {
		return await this.db
			.select()
			.from(releaseExclusives)
			.where(eq(releaseExclusives.exclusiveProgramId, exclusiveProgramId))
			.all();
	}

	async getAll(): Promise<ReleaseExclusive[]> {
		return await this.db.select().from(releaseExclusives).all();
	}

	async deleteByReleaseId(releaseId: string): Promise<void> {
		await this.db
			.delete(releaseExclusives)
			.where(eq(releaseExclusives.releaseId, releaseId));
	}

	async deleteByReleaseAndProgram(
		releaseId: string,
		exclusiveProgramId: string,
	): Promise<void> {
		await this.db
			.delete(releaseExclusives)
			.where(
				and(
					eq(releaseExclusives.releaseId, releaseId),
					eq(releaseExclusives.exclusiveProgramId, exclusiveProgramId),
				),
			);
	}
}
