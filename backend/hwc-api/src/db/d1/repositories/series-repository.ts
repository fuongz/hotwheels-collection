import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type Collection, collections, type NewCollection } from "../schema";

export class CollectionsRepository {
	constructor(private db: DrizzleD1Database) {}

	async upsert(
		data: Omit<NewCollection, "id" | "createdAt" | "updatedAt">,
	): Promise<Collection> {
		const [result] = await this.db
			.insert(collections)
			.values(data)
			.onConflictDoUpdate({
				target: collections.code,
				set: {
					...data,
					updatedAt: new Date(),
				},
			})
			.returning();
		return result;
	}

	async findByCode(code: string): Promise<Collection | undefined> {
		return await this.db
			.select()
			.from(collections)
			.where(eq(collections.code, code))
			.get();
	}

	async findByName(name: string): Promise<Collection | undefined> {
		return await this.db
			.select()
			.from(collections)
			.where(eq(collections.name, name))
			.get();
	}

	async findById(id: number): Promise<Collection | undefined> {
		return await this.db
			.select()
			.from(collections)
			.where(eq(collections.id, id))
			.get();
	}

	async getAll(): Promise<Collection[]> {
		return await this.db.select().from(collections).all();
	}
}
