export const r2Client = (
	env: CloudflareBindings,
	bucket: keyof CloudflareBindings,
) => {
	return bucket && env?.[bucket] ? (env[bucket] as R2Bucket) : null;
};

/**
 * Upload an image to R2 from a URL
 * @param bucket R2 bucket instance
 * @param imageUrl URL of the image to download and upload
 * @param key The key to store the image under in R2
 * @returns The R2 key with r2:// prefix
 */
export async function uploadImageToR2(
	bucket: R2Bucket,
	imageUrl: string,
	key: string,
): Promise<string> {
	try {
		// Fetch the image from the URL
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`);
		}

		// Get the content type
		const contentType = response.headers.get("content-type") || "image/jpeg";

		// Upload to R2
		await bucket.put(key, response.body, {
			httpMetadata: {
				contentType,
			},
		});

		return `r2://${key}`;
	} catch (error) {
		console.error(`Error uploading image to R2: ${imageUrl}`, error);
		throw error;
	}
}

/**
 * Generate a unique R2 key for a car photo
 * @param toyCode The toy code (e.g., "001-250")
 * @param year The year
 * @param index The photo index
 * @param url The original URL (to extract extension)
 * @returns The R2 key path
 */
export function generatePhotoKey(
	toyCode: string,
	year: string,
	index: number,
	url: string,
): string {
	// Extract extension from URL or default to jpg
	const extension = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)?.[1] || "jpg";

	// Sanitize toy code for file path
	const sanitizedCode = toyCode.replace(/[^a-zA-Z0-9-]/g, "_");

	// Generate path: cars/{year}/{toyCode}/{index}.{ext}
	return `cars/${year}/${sanitizedCode}/${index}.${extension}`;
}
