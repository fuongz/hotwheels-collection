/**
 * Normalise a wiki slug into a DB-safe code:
 * - Remove `(` and `)`
 * - Convert every other non-alphanumeric / non-underscore character to `_`
 * - Collapse consecutive underscores into one
 * - Trim leading / trailing underscores
 *
 * Examples:
 *   "HW_Dream_Garage_(2026)"      → "HW_Dream_Garage_2026"
 *   "Mazda_MX-5_Miata_(2025)"     → "Mazda_MX_5_Miata_2025"
 *   "Fast_&_Furious:_Twin_Mill"   → "Fast_Furious_Twin_Mill"
 */
export function slugToCode(slug: string): string {
	return slug
		.replace(/[()]/g, "")
		.replace(/[^a-zA-Z0-9_]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");
}
