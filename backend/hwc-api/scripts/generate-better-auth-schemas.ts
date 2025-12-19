import { getAdapter } from "better-auth/db";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auth } from "../src/auth";
import { generateDrizzleSchema } from "./_vendor/drizzle";

export default async (env: CloudflareBindings) => {
	const betterAuth = auth(env);
	const output = await generateDrizzleSchema({
		adapter: await getAdapter(betterAuth.options),
		options: betterAuth.options,
		file: resolve(import.meta.dirname, "../src/db/d1/schemas/auth.ts")
	});
	await writeFile(output.fileName, output.code ?? "");
	console.log(`Better auth schema generated successfully at (${output.fileName} 🎉`);
};
