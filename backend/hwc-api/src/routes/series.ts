import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { CarsRepository } from "../db/d1/repositories/cars-repository";
import { optionalAuthMiddleware } from "../middlewares/auth-middleware";
import type { App } from "../types";

const app = new Hono<App>();

app.get(
	":id",
	optionalAuthMiddleware,
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
	async ({ json, env, req, get }) => {
		try {
			const user = get("user");
			const { page, limit, sortBy, sortOrder, year, q } = req.valid("query");
			const { id } = req.param();
			const carsRepo = new CarsRepository(env);
			return json(
				await carsRepo.paginateByCollectionId(
					id,
					parseInt(page, 10),
					parseInt(limit, 10),
					{
						sortBy,
						sortOrder,
						year,
						q,
					},
					user ? user.id : undefined,
				),
			);
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

export { app as seriesRoute };
