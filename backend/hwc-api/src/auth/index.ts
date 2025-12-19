import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/d1/schemas/auth";

export const auth = (env: CloudflareBindings) => {
	return betterAuth({
		database: drizzleAdapter(drizzle(env.DB), {
			provider: "sqlite",
			schema: schema,
		}),
		emailAndPassword: {
			enabled: true,
		},
		trustedOrigins: ["http://localhost:3001"],
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
	});
};
