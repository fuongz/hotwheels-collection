import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";
import { dbClient } from "./db/d1/index";
import { CarsRepository } from "./db/d1/repositories/cars_repository";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
	cors({
		origin: ["http://localhost:3001", "https://hotwheels.phake.app"],
		allowMethods: ["GET"],
		allowHeaders: ["Content-Type"],
	}),
);

// app.get("/sync/:year", async ({ json, env, req }) => {
// 	try {
// 		const { year } = req.param();
// 		const spider = new ScrapeTableSpider(env.DB, env.BUCKET);
// 		await spider.startRequests(year);
// 		return json({ message: "OK" });
// 	} catch (err: any) {
// 		console.log(err);
// 		return json(err.message, 500);
// 	}
// });

app.get(
	"/v1/cars",
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
	async ({ json, env, req }) => {
		try {
			const { page, limit, sortBy, sortOrder, year, q } = req.valid("query");
			const db = dbClient(env.DB);
			const carsRepo = new CarsRepository(db);
			const cars = await carsRepo.paginate(
				parseInt(page, 10),
				parseInt(limit, 10),
				{
					sortBy,
					sortOrder,
					year,
					q,
				},
			);
			const total = await carsRepo.count({ year, q });
			return json({
				data: cars,
				meta: { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
			});
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

export default app;
