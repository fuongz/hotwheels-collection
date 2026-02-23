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
					{ sortBy, sortOrder, year, q },
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
	"/:releaseId/save",
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
			const { releaseId } = c.req.param();
			const body = c.req.valid("json");
			const user = c.get("user");
			const userCarsRepo = new UserCarsRepository(c.env);
			const cacheService = new CacheService(c.env.KV);

			const cacheKey = `user_car:${user.id}:${releaseId}`;

			// Layer 1: check KV cache
			const cachedUserCar = await cacheService.get(cacheKey);
			if (cachedUserCar) {
				const userCar = await userCarsRepo.upsert({
					userId: user.id,
					releaseId,
					quantity: body.quantity,
					notes: body.notes,
				});
				await cacheService.set(cacheKey, userCar, 86400);
				return c.json({ success: true, data: userCar, cached: true });
			}

			// Layer 2: check D1
			const existing = await userCarsRepo.findByUserIdAndReleaseId(
				user.id,
				releaseId,
			);
			if (existing) {
				const userCar = await userCarsRepo.upsert({
					userId: user.id,
					releaseId,
					quantity: body.quantity,
					notes: body.notes,
				});
				await cacheService.set(cacheKey, userCar, 86400);
				return c.json({ success: true, data: userCar, cached: false });
			}

			const userCar = await userCarsRepo.upsert({
				userId: user.id,
				releaseId,
				quantity: body.quantity,
				notes: body.notes,
			});
			await cacheService.set(cacheKey, userCar, 86400);
			return c.json({ success: true, data: userCar });
		} catch (err: any) {
			console.log(err);
			return c.json({ error: err.message }, 500);
		}
	},
);

app.delete("/:releaseId/save", authMiddleware, async (c) => {
	try {
		const { releaseId } = c.req.param();
		const user = c.get("user");
		const userCarsRepo = new UserCarsRepository(c.env);
		const cacheService = new CacheService(c.env.KV);

		await userCarsRepo.delete(user.id, releaseId);

		const cacheKey = `user_car:${user.id}:${releaseId}`;
		await cacheService.del(cacheKey);

		return c.json({ success: true });
	} catch (err: any) {
		console.log(err);
		return c.json({ error: err.message }, 500);
	}
});

// ----------------------------------------------------------------------------
// - ADMIN
// ----------------------------------------------------------------------------
app.post(
	"/:releaseId/remove-image",
	adminMiddleware,
	async ({ env, req, json }) => {
		try {
			const { releaseId } = req.param();
			const carsRepo = new CarsRepository(env);
			return json(await carsRepo.removeImage(releaseId));
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

app.post(
	"/:releaseId/upload-image",
	adminMiddleware,
	zValidator(
		"json",
		z.object({
			buffer: z.array(z.number()).min(1),
			filename: z.string(),
			contentType: z.string(),
		}),
	),
	async ({ env, req, json }) => {
		try {
			const { releaseId } = req.param();
			const image = req.valid("json");
			const carsRepo = new CarsRepository(env);
			return json(
				await carsRepo.uploadImage(releaseId, {
					buffer: image.buffer,
					filename: image.filename,
					contentType: image.contentType,
				}),
			);
		} catch (err: any) {
			console.log(err);
			return json({ error: err.message }, 500);
		}
	},
);

// sync pulls casting + designer data from Fandom wiki into the DB
app.post("/:castingId/sync", adminMiddleware, async ({ env, req, json }) => {
	try {
		const { castingId } = req.param();
		const carsRepo = new CarsRepository(env);
		return json(await carsRepo.sync(castingId));
	} catch (err: any) {
		console.log(err);
		return json({ error: err.message }, 500);
	}
});

export { app as carsRoute };
