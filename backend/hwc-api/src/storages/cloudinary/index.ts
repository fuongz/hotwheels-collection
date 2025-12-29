import type {
	ResourceApiResponse,
	UploadApiOptions,
	UploadApiResponse,
} from "cloudinary";
import { v2 as cloudinary } from "cloudinary";

interface CloudinaryConfig {
	cloudName: string;
	apiKey: string;
	apiSecret: string;
}

interface CloudinaryUploadOptions extends UploadApiOptions {
	folder?: string;
	public_id?: string;
	overwrite?: boolean;
	resource_type?: "image" | "video" | "raw" | "auto";
	format?: string;
	transformation?: string;
}

interface CloudinaryImageOptions {
	width?: number;
	height?: number;
	crop?: "scale" | "fit" | "fill" | "limit" | "pad" | "crop" | "thumb";
	quality?: number | "auto";
	format?: "jpg" | "png" | "webp" | "avif" | "auto";
	fetch_format?: "auto";
}

export class CloudinaryClient {
	private cloudName: string;

	constructor(config: CloudinaryConfig) {
		this.cloudName = config.cloudName;

		// Configure Cloudinary
		cloudinary.config({
			cloud_name: config.cloudName,
			api_key: config.apiKey,
			api_secret: config.apiSecret,
			secure: true,
		});
	}

	/**
	 * Upload an image to Cloudinary from a buffer
	 * @param buffer The image buffer to upload
	 * @param options Upload options
	 * @returns Cloudinary upload response
	 */
	async uploadImageFromBuffer(
		buffer: ArrayBuffer,
		options: CloudinaryUploadOptions = {},
	): Promise<UploadApiResponse> {
		try {
			// Convert ArrayBuffer to Buffer
			const nodeBuffer = Buffer.from(buffer);

			// Convert buffer to base64
			const base64String = `data:image/jpeg;base64,${nodeBuffer.toString("base64")}`;

			const result = await cloudinary.uploader.upload(base64String, {
				...options,
				resource_type: options.resource_type || "image",
			});

			console.log(`----> LOG [Cloudinary] Uploaded image: ${result.public_id}`);
			return result;
		} catch (error) {
			console.error("----> ERROR [Cloudinary] Failed to upload image:", error);
			throw error;
		}
	}

	/**
	 * Upload an image to Cloudinary from a URL
	 * @param imageUrl The URL of the image to upload
	 * @param options Upload options
	 * @returns Cloudinary upload response
	 */
	async uploadImageFromUrl(
		imageUrl: string,
		options: CloudinaryUploadOptions = {},
	): Promise<UploadApiResponse> {
		try {
			const result = await cloudinary.uploader.upload(imageUrl, {
				...options,
				resource_type: options.resource_type || "image",
			});

			console.log(
				`----> LOG [Cloudinary] Uploaded image from URL: ${result.public_id}`,
			);
			return result;
		} catch (error) {
			console.error(
				"----> ERROR [Cloudinary] Failed to upload image from URL:",
				error,
			);
			throw error;
		}
	}

	/**
	 * Get an optimized image URL from Cloudinary
	 * @param publicId The public ID of the image (or full Cloudinary URL)
	 * @param options Image transformation options
	 * @returns The optimized image URL
	 */
	getImageUrl(publicId: string, options: CloudinaryImageOptions = {}): string {
		// If it's already a full Cloudinary URL, extract the public_id
		let imagePublicId = publicId;
		if (publicId.includes("cloudinary.com")) {
			// Extract public_id from URL
			// Example: https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg
			const match = publicId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
			if (match) {
				imagePublicId = match[1];
			}
		}

		// Build transformation options
		const transformation: any = {};

		if (options.width) transformation.width = options.width;
		if (options.height) transformation.height = options.height;
		if (options.crop) transformation.crop = options.crop;
		if (options.quality) transformation.quality = options.quality;
		if (options.format) transformation.fetch_format = options.format;
		if (options.fetch_format)
			transformation.fetch_format = options.fetch_format;

		const url = cloudinary.url(imagePublicId, transformation);
		return url;
	}

	/**
	 * Get image details from Cloudinary
	 * @param publicId The public ID of the image
	 * @returns Image details
	 */
	async getImageDetails(publicId: string): Promise<ResourceApiResponse> {
		try {
			const result = await cloudinary.api.resource(publicId, {
				resource_type: "image",
			});
			return result;
		} catch (error) {
			console.error(
				"----> ERROR [Cloudinary] Failed to get image details:",
				error,
			);
			throw error;
		}
	}

	/**
	 * Delete an image from Cloudinary
	 * @param publicId The public ID of the image to delete
	 * @returns Deletion result
	 */
	async deleteImage(publicId: string): Promise<any> {
		try {
			const result = await cloudinary.uploader.destroy(publicId);
			console.log(`----> LOG [Cloudinary] Deleted image: ${publicId}`);
			return result;
		} catch (error) {
			console.error("----> ERROR [Cloudinary] Failed to delete image:", error);
			throw error;
		}
	}

	/**
	 * Delete multiple images from Cloudinary
	 * @param publicIds Array of public IDs to delete
	 * @returns Deletion result
	 */
	async deleteImages(publicIds: string[]): Promise<any> {
		try {
			const result = await cloudinary.api.delete_resources(publicIds);
			console.log(`----> LOG [Cloudinary] Deleted ${publicIds.length} images`);
			return result;
		} catch (error) {
			console.error("----> ERROR [Cloudinary] Failed to delete images:", error);
			throw error;
		}
	}

	/**
	 * Generate a unique key for a car photo
	 * @param toyCode The toy code (e.g., "001-250")
	 * @param year The year
	 * @param index The photo index
	 * @returns The Cloudinary public_id
	 */
	static generatePhotoKey(
		toyCode: string,
		year: string,
		index: number,
	): string {
		// Sanitize toy code for file path
		const sanitizedCode = toyCode.replace(/[^a-zA-Z0-9-]/g, "_");

		// Generate path: cars/{year}/{toyCode}/{index}
		return `cars/${year}/${sanitizedCode}/${index}`;
	}
}

/**
 * Create a Cloudinary client instance
 * @param env Cloudflare bindings
 * @returns CloudinaryClient instance
 */
export async function createCloudinaryClient(
	env: CloudflareBindings,
): Promise<CloudinaryClient> {
	const cloudName = await env.CLOUDINARY_CLOUD_NAME.get();
	const apiKey = await env.CLOUDINARY_API_KEY.get();
	const apiSecret = await env.CLOUDINARY_API_SECRET.get();

	if (!cloudName || !apiKey || !apiSecret) {
		throw new Error("Cloudinary configuration not found");
	}

	return new CloudinaryClient({
		cloudName,
		apiKey,
		apiSecret,
	});
}
