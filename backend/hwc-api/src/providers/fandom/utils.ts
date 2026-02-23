export function generateSlug(name: string): string {
	if (!name) return "";
	return name.replaceAll(" ", "_");
}

export function generateTitle(name: string): string {
	if (!name) return "";
	return name.replaceAll("_", " ");
}
