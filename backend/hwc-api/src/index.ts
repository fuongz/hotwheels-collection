import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";
import { ScrapeTableSpider } from "../scripts/scrape";
import { UpsertCars } from "../scripts/upsert";
import { auth } from "./auth";
import { CarsRepository } from "./db/d1/repositories/cars_repository";
import { adminMiddleware } from "./middlewares/admin-middleware";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
	"/v1/*",
	cors({
		origin: ["http://localhost:3001", "https://hotwheels.phake.app"],
		allowMethods: ["GET"],
		allowHeaders: ["Content-Type"],
	}),
);

app.use(
	"/api/auth/*",
	cors({
		origin: ["http://localhost:3001", "https://hotwheels.phake.app"],
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth(c.env).handler(c.req.raw);
});

app.get("/sync/:year", adminMiddleware, async ({ json, env, req }) => {
	try {
		const { year } = req.param();
		const spider = new ScrapeTableSpider(env);
		const results = await spider.startRequests(year);
		return json(results);
	} catch (err: any) {
		console.log(err);
		return json(err.message, 500);
	}
});

app.get("/upsert/:year", adminMiddleware, async ({ json, env, req }) => {
	try {
		const { year } = req.param();
		const spider = new UpsertCars(env);
		const results = await spider.run(year);
		return json(results);
	} catch (err: any) {
		console.log(err);
		return json(err.message, 500);
	}
});

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
			const carsRepo = new CarsRepository(env);
			return json(
				await carsRepo.paginate(parseInt(page, 10), parseInt(limit, 10), {
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

app.get(
	"/v1/series/:id",
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
				),
			);
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

export default app;
