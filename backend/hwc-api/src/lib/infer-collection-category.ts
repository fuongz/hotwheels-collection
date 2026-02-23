import type { CollectionCategory } from "../db/d1/schema";

type CategoryCode = CollectionCategory["code"];

// Keywords are tested against the lowercased slug + name combined string.
// First matching rule wins — order matters (most specific first).
const RULES: Array<{ keywords: string[]; category: CategoryCode }> = [
	// ── Exclusives ────────────────────────────────────────────────────────────
	{
		keywords: [
			"red_line_club",
			"rlc",
			"hwc",
			"sdcc",
			"comic.con",
			"comic_con",
			"convention",
			"exclusive",
			"selections",
			"kroger",
			"target",
			"walmart",
			"amazon",
			"costco",
			"kmart",
			"meijer",
			"dollar_tree",
			"five_below",
			"store_exclusive",
		],
		category: "exclusive",
	},

	// ── Larger scale ──────────────────────────────────────────────────────────
	{
		keywords: ["1:43", "1:50", "1:18", "larger_scale", "large_scale"],
		category: "larger_scale",
	},

	// ── Modern special / premium lines ────────────────────────────────────────
	{
		keywords: [
			"car_culture",
			"pop_culture",
			"boulevard",
			"collector_edition",
			"collector_series",
			"premium",
			"fast_and_furious",
			"fast_%26_furious",
			"retro_entertainment",
			"pop_culture",
			"real_riders",
		],
		category: "modern_special",
	},

	// ── Modern series / themed lines ──────────────────────────────────────────
	{
		keywords: [
			"monster_truck",
			"monster_jam",
			"hot_wheels_id",
			"hw_id",
			"skate",
			"starship",
			"rc_",
			"_rc_",
			"radio_control",
			"remote_control",
			"track_set",
			"action_set",
		],
		category: "modern_series",
	},

	// ── Early special (pre-2000 special lines) ────────────────────────────────
	{
		keywords: [
			"action_pack",
			"color_changer",
			"tattoo_machine",
			"mystery_car",
			"ultra_hots",
			"crack_ups",
		],
		category: "early_special",
	},

	// ── Early collection (pre-2000 yearly lines) ──────────────────────────────
	{
		keywords: [
			"flying_colors",
			"super_chrome",
			"blackwall",
			"redline",
			"red_line",
			"original_sixteen",
			"original_hot_sixteen",
		],
		category: "early_collection",
	},

	// ── Misc / multipacks ─────────────────────────────────────────────────────
	{
		keywords: [
			"multi_pack",
			"multipack",
			"5-pack",
			"6-pack",
			"10-pack",
			"gift_pack",
			"value_pack",
		],
		category: "misc",
	},
];

/**
 * Infer a collectionCategories.code from a wiki slug + human name.
 * Falls back to "mainline" when no rule matches.
 */
export function inferCategoryCode(
	wikiSlug: string,
	name: string,
): CategoryCode {
	const haystack = `${wikiSlug} ${name}`.toLowerCase();

	for (const rule of RULES) {
		if (rule.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
			return rule.category;
		}
	}

	return "mainline";
}
