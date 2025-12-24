import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";

// -- repositories
import { CarsRepository } from "../db/d1/repositories/cars-repository";

// -- middlewares
import { authMiddleware } from "../middlewares/auth-middleware";

// -- types
import type { App } from "../types";

const app = new Hono<App>().use(authMiddleware);

app.get(
	"/cars",
	authMiddleware,
	zValidator(
		"query",
		z.object({
			q: z.string().optional(),
			page: z.string().default("1"),
			limit: z.string().default("10"),
			sortBy: z.string().default("updated_at"),
			sortOrder: z.string().default("asc"),
			year: z.string().optional(),
		}),
	),
	async ({ json, env, get, req }) => {
		try {
			const user = get("user");
			const { page, limit, sortBy, sortOrder, year, q } = req.valid("query");
			const carsRepo = new CarsRepository(env);
			return json(
				await carsRepo.paginateByUserId(user.id, {
					page: parseInt(page, 10),
					limit: parseInt(limit, 10),
					sortBy,
					sortOrder,
					year,
					q,
				}),
			);
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

export { app as meRoute };
