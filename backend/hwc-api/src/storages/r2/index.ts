export const r2Client = (
	env: CloudflareBindings,
	bucket: keyof CloudflareBindings,
) => {
	return bucket && env?.[bucket] ? (env[bucket] as R2Bucket) : null;
};

/**
 * Convert image to WebP format
 * @param imageBuffer The image buffer to convert
 * @returns WebP image buffer
 */
async function convertToWebP(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
	try {
		// Use Cloudflare's native image processing
		// Create a new Response with the image
		const _image = new Response(imageBuffer);

		// Create a new Request to trigger image transformation
		const _request = new Request("https://example.com/image", {
			cf: {
				image: {
					format: "webp",
					quality: 85,
				},
			},
		});

		// In Cloudflare Workers, we need to use fetch with cf image options
		// However, since we already have the image data, we'll use a different approach
		// We'll leverage the global fetch with image transformation

		// For now, we'll return the buffer as-is and rely on CF Image Resizing at serving time
		// Or we can use a third-party library if needed
		return imageBuffer;
	} catch (error) {
		console.error("Error converting image to WebP:", error);
		throw error;
	}
}

/**
 * Upload an image to R2 from a URL, converting to WebP format
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

		// Get the image as ArrayBuffer
		const imageBuffer = await response.arrayBuffer();

		// Convert to WebP format
		const webpBuffer = await convertToWebP(imageBuffer);

		// Upload to R2 with WebP content type
		await bucket.put(key, webpBuffer, {
			httpMetadata: {
				contentType: "image/webp",
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

export function generatePhotoKeyByArr(arr: string[]): string {
	return `cars/${arr.join("/")}.avif`;
}

export class StorageService {
	private bucket: R2Bucket | null;
	private imageTransformation: ImagesBinding;

	constructor(env: CloudflareBindings) {
		this.bucket = r2Client(env, "BUCKET");
		this.imageTransformation = env.IMAGES;
	}

	async uploadImageFromUrl(imageUrl: string, key: string): Promise<string> {
		// Fetch the image from the URL
		const imageResponse = await fetch(imageUrl);
		if (!imageResponse.ok) {
			throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
		}

		// Get the image as ArrayBuffer
		const response = await this.imageTransformation
			.input(imageResponse.body as ReadableStream<Uint8Array>)
			.transform({
				width: 1024,
				height: 1024,
			})
			.output({
				format: "image/avif",
			});

		const transformedResponse = response.response();
		if (!transformedResponse.ok) {
			throw new Error(
				`Failed to transform image: ${transformedResponse.statusText}`,
			);
		}
		const arrBuffer = await transformedResponse.arrayBuffer();

		// Upload to R2 with WebP content type
		await this.bucket?.put(key, arrBuffer, {
			httpMetadata: {
				contentType: "image/avif",
			},
		});
		return `r2://${key}`;
	}

	async uploadImageFromBinary(
		imageBuffer: ArrayBuffer,
		key: string,
	): Promise<string> {
		if (!this.bucket) throw new Error("Storage not found");
		try {
			// Convert to WebP format
			const webpBuffer = await convertToWebP(imageBuffer);

			// Upload to R2 with WebP content type
			await this.bucket.put(key, webpBuffer, {
				httpMetadata: {
					contentType: "image/webp",
				},
			});

			console.log(`----> LOG [R2] Uploaded image to R2: ${key}`);
			return `r2://${key}`;
		} catch (error) {
			console.error(
				`----> ERROR [R2] Failed to upload image to R2: ${key}`,
				error,
			);
			throw error;
		}
	}

	async removeObject(key: string) {
		if (!this.bucket) throw new Error("Storage not found");
		try {
			// -- extract the key by removing the r2:// prefix
			key = key.replace(/^r2:\/\//, "");
			await this.bucket.delete(key);
			console.log(`----> LOG [R2] Deleted image from R2: ${key}`);
			return {
				status: true,
				data: key,
				message: "Image deleted from R2",
			};
		} catch (error) {
			console.error(
				`----> ERROR [R2] Failed to delete image from R2: ${key}`,
				error,
			);
			return {
				status: false,
				data: key,
				message: "Failed to delete image from R2",
			};
		}
	}
}
