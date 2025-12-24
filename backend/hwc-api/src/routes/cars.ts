import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";

// -- services
import { CacheService } from "../cache/kv/cache.service";

// -- repositories
import { CarsRepository } from "../db/d1/repositories/cars-repository";
import { UserCarsRepository } from "../db/d1/repositories/user-cars-repository";
import { adminMiddleware } from "../middlewares/admin-middleware";

// -- middlewares
import {
	authMiddleware,
	optionalAuthMiddleware,
} from "../middlewares/auth-middleware";

// -- types
import type { App } from "../types";

const app = new Hono<App>();

app.get(
	"/",
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
			const carsRepo = new CarsRepository(env);
			return json(
				await carsRepo.paginate(
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

// ----------------------------------------------------------------------------
// - AUTHENTICATED
// ----------------------------------------------------------------------------
app.post(
	"/:carId/save",
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

// ----------------------------------------------------------------------------
// - ADMIN
// ----------------------------------------------------------------------------
app.post(
	"/:carId/remove-image",
	adminMiddleware,
	async ({ env, req, json }) => {
		try {
			const { carId } = req.param();
			const carsRepo = new CarsRepository(env);
			return json(await carsRepo.removeImage(carId));
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

export { app as carsRoute };
