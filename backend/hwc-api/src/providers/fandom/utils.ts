export function generateSlug(name: string): string {
	return name.replaceAll(" ", "_");
}
