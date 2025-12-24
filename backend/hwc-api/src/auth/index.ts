import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/d1/schemas/auth";

export const auth = async (env: CloudflareBindings) => {
	// -- get secrets from cf->secrets store
	const secretKey = await env.BETTER_AUTH_SECRET.get();
	const googleClientId = await env.GOOGLE_CLIENT_ID.get();
	const googleClientSecret = await env.GOOGLE_CLIENT_SECRET.get();

	return betterAuth({
		database: drizzleAdapter(drizzle(env.DB), {
			provider: "sqlite",
			schema: schema,
		}),
		advanced: {
			ipAddress: {
				ipAddressHeaders: ["cf-connecting-ip"],
			},
		},
		rateLimit: {
			enabled: true,
			storage: "secondary-storage",
		},
		secondaryStorage: {
			get: async (key: string) => {
				try {
					const value = await env.KV.get(key);
					return value;
				} catch (error: any) {
					console.log("----> LOG [ERR:AUTH]:", error);
					return null;
				}
			},
			set: async (key: string, value: string) => {
				try {
					await env.KV.put(key, value, { expirationTtl: 60 * 60 * 24 * 7 });
				} catch (error: any) {
					console.log("----> LOG [ERR:AUTH]:", error);
				}
			},
			delete: async (key: string) => {
				try {
					await env.KV.delete(key);
				} catch (error: any) {
					console.log("----> LOG [ERR:AUTH]:", error);
				}
			},
		},
		baseUrl: env.BETTER_AUTH_URL,
		socialProviders: {
			google: {
				clientId: googleClientId,
				clientSecret: googleClientSecret,
				accessType: "offline",
				prompt: "select_account consent",
			},
		},
		emailAndPassword: {
			enabled: true,
		},
		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ["google"],
			},
		},
		trustedOrigins: [env.FRONTEND_URL],
		secret: secretKey,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [admin()],
	});
};
