import { dbClient } from "../src/db/d1";
import {
	collectionCategories,
	collectionTypes,
	NewCollectionCategory,
	NewCollectionType,
} from "../src/db/d1/schema";

const COLLECTION_CATEGORIES: NewCollectionCategory[] = [
	{
		code: "mainline",
		name: "Mainline",
		description:
			"Main yearly basic lines (e.g. List of 2026 Hot Wheels).",
	},
	{
		code: "early_collection",
		name: "Early Collection",
		description:
			"Early classic lines (e.g. Flying Colors, Super Chromes).",
	},
	{
		code: "early_special",
		name: "Early Special",
		description:
			"Early special series (e.g. Action Packs, Color Changers).",
	},
	{
		code: "modern_special",
		name: "Modern Special",
		description:
			"Modern premium / special lines (e.g. Car Culture, Pop Culture).",
	},
	{
		code: "modern_series",
		name: "Modern Series",
		description:
			"Modern themed product lines (Monster Trucks, Skate, Starships, RC, etc.).",
	},
	{
		code: "exclusive",
		name: "Exclusive",
		description:
			"Exclusive programs and channels (Red Line Club, HWC.com, SDCC).",
	},
	{
		code: "larger_scale",
		name: "Larger Scale",
		description: "Larger scale die-cast models (1:43, 1:50, etc.).",
	},
	{
		code: "misc",
		name: "Miscellaneous",
		description: "Multipacks, mixed sets, and uncategorized collections.",
	},
] as const;

const COLLECTION_TYPES: NewCollectionType[] = [
	{
		code: "basic",
		name: "Basic",
		description: "Standard mainline basic cars.",
	},
	{
		code: "premium",
		name: "Premium",
		description:
			"Premium lines (Car Culture, Boulevard, RLC-style).",
	},
	{
		code: "multi_pack",
		name: "Multi-Pack",
		description: "Bundled multi-car sets (5-packs, 6-packs, etc.).",
	},
	{
		code: "monster_truck",
		name: "Monster Truck",
		description: "Hot Wheels Monster Trucks line.",
	},
	{
		code: "track_set",
		name: "Track Set",
		description: "Track and play-set products.",
	},
	{
		code: "character_cars",
		name: "Character Cars",
		description: "Licensed character-themed die-cast cars.",
	},
	{
		code: "rc",
		name: "RC",
		description: "Radio-controlled vehicles.",
	},
	{
		code: "id",
		name: "id",
		description: "Hot Wheels id smart cars with embedded chips.",
	},
] as const;

export default async (env: CloudflareBindings) => {
	if (!env.DB) throw new Error("DB binding not available");

	const db = dbClient(env.DB);

	// Seed collectionCategories
	await db
		.insert(collectionCategories)
		.values(COLLECTION_CATEGORIES)
		.onConflictDoUpdate({
			target: collectionCategories.code,
			set: {
				name: collectionCategories.name,
				description: collectionCategories.description,
			},
		});
	console.log(
		`----> LOG [Seed] Upserted ${COLLECTION_CATEGORIES.length} collection categories`,
	);

	// Seed collectionTypes
	await db
		.insert(collectionTypes)
		.values(COLLECTION_TYPES)
		.onConflictDoUpdate({
			target: collectionTypes.code,
			set: {
				name: collectionTypes.name,
				description: collectionTypes.description,
			},
		});
	console.log(
		`----> LOG [Seed] Upserted ${COLLECTION_TYPES.length} collection types`,
	);

	console.log("----> LOG [Seed] ✓ Collection lookups seeded successfully");
};
