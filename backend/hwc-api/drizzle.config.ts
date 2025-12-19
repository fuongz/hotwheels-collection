import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: [
		"./src/db/d1/schema.ts",
		"./src/db/d1/schemas/*.ts"
	],
	out: "./drizzle/migrations",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
		databaseId: process.env.CLOUDFLARE_DATABASE_ID as string,
		token: process.env.CLOUDFLARE_D1_TOKEN as string,
	},
});
