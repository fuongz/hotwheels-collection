import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import z from "zod";
import { ScrapeTableSpider } from "../scripts/scrape";
import { UpsertCars } from "../scripts/upsert";
import { auth } from "./auth";
import { CacheService } from "./cache/kv/cache.service";
import { CarsRepository } from "./db/d1/repositories/cars_repository";
import { UserCarsRepository } from "./db/d1/repositories/user_cars_repository";
import { adminMiddleware } from "./middlewares/admin-middleware";
import {
	type AuthVariables,
	authMiddleware,
} from "./middlewares/auth-middleware";

const app = new Hono<{
	Bindings: CloudflareBindings;
	Variables: AuthVariables;
}>();

app.use(
	"/v1/*",
	cors({
		origin: ["http://localhost:3001", "https://hotwheels.phake.app"],
		allowMethods: ["GET", "POST", "PUT", "DELETE"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
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

app.post(
	"/v1/cars/:carId/save",
	authMiddleware,
	zValidator(
		"json",
		z.object({
			quantity: z.number().int().positive().default(1),
			notes: z.string().optional(),
		}),
	),
	async (c) => {
		try {
			const { carId } = c.req.param();
			const body = c.req.valid("json");
			const user = c.get("user");
			const userCarsRepo = new UserCarsRepository(c.env);
			const cacheService = new CacheService(c.env.KV);

			// Two-layer duplicate check: KV cache first, then D1
			const cacheKey = `user_car:${user.id}:${carId}`;

			// Layer 1: Check KV cache
			const cachedUserCar = await cacheService.get(cacheKey);
			if (cachedUserCar) {
				// Found in cache - this is likely a duplicate attempt
				const userCar = await userCarsRepo.upsert({
					userId: user.id,
					carId: carId,
					quantity: body.quantity,
					notes: body.notes,
				});

				// Update cache with new values
				await cacheService.set(cacheKey, userCar, 86400); // 1 day

				return c.json({ success: true, data: userCar, cached: true });
			}

			// Layer 2: Check D1 database
			const existing = await userCarsRepo.findByUserIdAndCarId(user.id, carId);
			if (existing) {
				// Found in database - update the record
				const userCar = await userCarsRepo.upsert({
					userId: user.id,
					carId: carId,
					quantity: body.quantity,
					notes: body.notes,
				});

				// Cache the result for future requests
				await cacheService.set(cacheKey, userCar, 86400); // 1 day

				return c.json({ success: true, data: userCar, cached: false });
			}

			// Not a duplicate - create new record
			const userCar = await userCarsRepo.upsert({
				userId: user.id,
				carId: carId,
				quantity: body.quantity,
				notes: body.notes,
			});

			// Cache the newly created record
			await cacheService.set(cacheKey, userCar, 86400); // 1 day

			return c.json({ success: true, data: userCar });
		} catch (err: any) {
			console.log(err);
			return c.json({ error: err.message }, 500);
		}
	},
);

export default app;
