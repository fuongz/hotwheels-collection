import { Hono } from "hono";
import { ScrapeTableSpider } from "../../scripts/scrape";
import { UpsertCars } from "../../scripts/upsert";
import { adminMiddleware } from "../middlewares/admin-middleware";
import type { App } from "../types";

const app = new Hono<App>().use(adminMiddleware);

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

export { app as adminRoute };
