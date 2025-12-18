import { and, eq, like, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { orderBuilder, wheresBuilder } from "../builder";
import { type Car, cars, type NewCar } from "../schema";

export class CarsRepository {
	constructor(private db: DrizzleD1Database) {}

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

	async findByToyCode(toyCode: string): Promise<Car | undefined> {
		return await this.db
			.select()
			.from(cars)
			.where(eq(cars.toyCode, toyCode))
			.get();
	}

	async findById(id: string): Promise<Car | undefined> {
		return await this.db.select().from(cars).where(eq(cars.id, id)).get();
	}

	async getAll(): Promise<Car[]> {
		return await this.db.select().from(cars).all();
	}

	async count(
		params: Record<string, string | any[] | undefined>,
	): Promise<number> {
		const { q, ...rest } = params;
		const wheres = wheresBuilder(cars, rest);
		if (q) {
			wheres.push(or(like(cars.model, `%${q}%`), like(cars.toyCode, `%${q}%`)));
		}
		return await this.db.$count(cars, and(...wheres));
	}

	async findByYear(year: string): Promise<Car[]> {
		return await this.db.select().from(cars).where(eq(cars.year, year)).all();
	}

	transformCar(car: Car): Car {
		return {
			...car,
			avatarUrl: car.avatarUrl ? car.avatarUrl?.replace("r2://", "/") : null,
		};
	}

	async paginate(
		page: number,
		limit: number,
		query: Partial<{
			sortBy: string;
			sortOrder: string;
		}> &
			Record<string, string | any[] | undefined>,
	): Promise<Car[]> {
		const { sortBy, sortOrder, q, ...whereQueries } = query;
		const wheres = wheresBuilder(cars, whereQueries);
		if (q) {
			wheres.push(or(like(cars.model, `%${q}%`), like(cars.toyCode, `%${q}%`)));
		}
		const sortParams = orderBuilder(
			cars,
			sortBy || "updated_at",
			sortOrder || "asc",
		);
		const offset = (page - 1) * limit;
		const response = await this.db
			.select()
			.from(cars)
			.where(and(...wheres))
			.offset(offset)
			.limit(limit)
			.orderBy(sortParams);
		return response.map((car) => this.transformCar(car));
	}
}
