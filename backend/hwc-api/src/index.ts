import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { adminRoute } from "./routes/admin";
// -- routes
import { carsRoute } from "./routes/cars";
import { meRoute } from "./routes/me";
import { seriesRoute } from "./routes/series";
// -- types
import type { App } from "./types";

const app = new Hono<App>();

app.use("/v1/*", async (c, next) => {
	const corsHandler = cors({
		origin: c.env.FRONTEND_URL,
		allowMethods: ["GET", "POST", "PUT", "DELETE"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});
	return corsHandler(c, next);
});

app.use("/api/auth/*", async (c, next) => {
	const corsHandler = cors({
		origin: c.env.FRONTEND_URL,
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	});
	return corsHandler(c, next);
});

app.on(["POST", "GET"], "/api/auth/*", async (c) => {
	const handler = await auth(c.env);
	return handler.handler(c.req.raw);
});

// -- routes
app.route("/v1/cars", carsRoute);
app.route("/v1/series", seriesRoute);
app.route("/v1/me", meRoute);

// -- (admin) routes
app.route("/admin", adminRoute);

export default app;
