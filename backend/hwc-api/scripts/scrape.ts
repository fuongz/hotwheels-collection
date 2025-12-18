import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { parse } from "parse5";
import { CarSeriesRepository } from "../src/db/d1/repositories/car_series_repository";
import { CarsRepository } from "../src/db/d1/repositories/cars_repository";
import { SeriesRepository } from "../src/db/d1/repositories/series_repository";
import { generatePhotoKey, uploadImageToR2 } from "../src/storages/r2";
import { dbClient } from "../src/db/d1";

type Parse5Node = {
	nodeName: string;
	childNodes?: Parse5Node[];
	attrs?: Array<{ name: string; value: string }>;
	value?: string;
};

/**
 * Scrapes the hotwheels.fandom wiki of Hot Wheels by year
 * scrape the resulting page in the
 * url pattern wiki/List_of_{year}_Hot_Wheels
 */

interface HotWheelData {
	toy_num: string;
	col_num: string;
	model: string;
	series: string[];
	series_num: string;
	photo_url: string[];
	year: string;
}

class ScrapeTableSpider {
	name = "scrape-table";
	private db?: DrizzleD1Database;
	private bucket?: R2Bucket;
	private carsRepo?: CarsRepository;
	private seriesRepo?: SeriesRepository;
	private carSeriesRepo?: CarSeriesRepository;
	// Cache to avoid repeated database queries
	private existingCarsMap: Map<string, any> = new Map();
	private existingSeriesMap: Map<string, any> = new Map();
	private existingCarSeriesMap: Map<string, any> = new Map();

	constructor(d1Database?: D1Database, bucket?: R2Bucket) {
		if (d1Database) {
			this.db = dbClient(d1Database);
			this.carsRepo = new CarsRepository(this.db);
			this.seriesRepo = new SeriesRepository(this.db);
			this.carSeriesRepo = new CarSeriesRepository(this.db);
		}
		this.bucket = bucket;
	}

	async startRequests(year: string): Promise<void> {
		// Load existing data into cache to avoid repeated DB queries
		await this.loadExistingDataToCache(year);

		const urls = [
			`https://hotwheels.fandom.com/wiki/List_of_${year}_Hot_Wheels`,
		];
		for (const url of urls) {
			await this.parse(url, year);
		}
	}

	// Load all existing cars, series, and relationships for the year into cache
	private async loadExistingDataToCache(year: string): Promise<void> {
		if (!this.carsRepo || !this.seriesRepo) return;

		console.log(`----> LOG [Cache] Loading existing data for year ${year}...`);

		// Load all cars for the year
		const existingCars = await this.carsRepo.findByYear(year);
		for (const car of existingCars) {
			this.existingCarsMap.set(car.toyCode, car);
		}
		console.log(`----> LOG [Cache] Loaded ${existingCars.length} existing cars`);

		// Load all series
		const existingSeries = await this.seriesRepo.getAll();
		for (const series of existingSeries) {
			this.existingSeriesMap.set(series.name, series);
		}
		console.log(
			`----> LOG [Cache] Loaded ${existingSeries.length} existing series`,
		);

		// Load all car-series relationships
		if (this.carSeriesRepo) {
			const allCarSeries = await this.carSeriesRepo.getAll();
			for (const rel of allCarSeries) {
				const cacheKey = `${rel.carId}-${rel.seriesId}`;
				this.existingCarSeriesMap.set(cacheKey, rel);
			}
			console.log(
				`----> LOG [Cache] Loaded ${allCarSeries.length} existing car-series relationships`,
			);
		}
	}

	// Helper method to check if a node is an Element
	private isElement(node: Parse5Node): boolean {
		return node.nodeName !== "#text" && node.nodeName !== "#comment";
	}

	// Find elements by class name
	private findElementsByClass(
		node: Parse5Node,
		className: string,
	): Parse5Node[] {
		const results: Parse5Node[] = [];

		const traverse = (currentNode: Parse5Node) => {
			if (this.isElement(currentNode)) {
				const attrs = currentNode.attrs || [];
				const classAttr = attrs.find(
					(attr: { name: string; value: string }) => attr.name === "class",
				);
				if (classAttr?.value.split(" ").includes(className)) {
					results.push(currentNode);
				}
			}

			const children = currentNode.childNodes || [];
			for (const child of children) {
				if (this.isElement(child)) {
					traverse(child);
				}
			}
		};

		traverse(node);
		return results;
	}

	// Find first element by tag name
	private findElementByTagName(
		node: Parse5Node,
		tagName: string,
	): Parse5Node | null {
		const children = node.childNodes || [];
		for (const child of children) {
			if (this.isElement(child) && child.nodeName === tagName) {
				return child;
			}
		}
		return null;
	}

	// Find all elements by tag name
	private findElementsByTagName(
		node: Parse5Node,
		tagName: string,
	): Parse5Node[] {
		const results: Parse5Node[] = [];
		const children = node.childNodes || [];

		for (const child of children) {
			if (this.isElement(child) && child.nodeName === tagName) {
				results.push(child);
			}
		}

		return results;
	}

	// Get text content from an element
	private getTextContent(node: Parse5Node): string {
		let text = "";

		const traverse = (currentNode: Parse5Node) => {
			if (currentNode.nodeName === "#text" && currentNode.value) {
				text += currentNode.value;
			}

			const children = currentNode.childNodes || [];
			for (const child of children) {
				traverse(child);
			}
		};

		traverse(node);
		return text;
	}

	// Find image links (a.image elements)
	private findImageLinks(node: Parse5Node): string[] {
		const links: string[] = [];

		const traverse = (currentNode: Parse5Node) => {
			if (this.isElement(currentNode) && currentNode.nodeName === "a") {
				const attrs = currentNode.attrs || [];
				const classAttr = attrs.find(
					(attr: { name: string; value: string }) => attr.name === "class",
				);
				const hrefAttr = attrs.find(
					(attr: { name: string; value: string }) => attr.name === "href",
				);

				if (classAttr?.value.includes("image") && hrefAttr) {
					links.push(hrefAttr.value);
				}
			}

			const children = currentNode.childNodes || [];
			for (const child of children) {
				if (this.isElement(child)) {
					traverse(child);
				}
			}
		};

		traverse(node);
		return links;
	}

	// Upsert series into database
	private async upsertSeries(
		name: string,
		seriesNum: string,
	): Promise<string | null> {
		if (!this.seriesRepo) return null;

		try {
			// Check cache first
			const cached = this.existingSeriesMap.get(name);
			if (cached) {
				console.log(`----> LOG [Cache] Series ${name} found in cache!`);
				return cached.id;
			}

			const series = await this.seriesRepo.upsert({
				name,
				seriesNum,
			});

			// Update cache
			this.existingSeriesMap.set(name, series);

			console.log(`----> LOG [DB=D1] Series ${name} upserted!`);
			return series.id;
		} catch (error) {
			console.error("Error upserting series:", error);
			throw error;
		}
	}

	// Upload photos to R2 and return R2 keys with r2:// prefix
	private async uploadPhotosToR2(
		photoUrls: string[],
		toyCode: string,
		year: string,
	): Promise<string[]> {
		if (!this.bucket || photoUrls.length === 0) return photoUrls;

		const bucket = this.bucket;

		// Upload all photos in parallel
		const uploadPromises = photoUrls.map(async (url, i) => {
			try {
				// Generate R2 key for this photo
				const key = generatePhotoKey(toyCode, year, i, url);

				// Upload to R2
				const r2Key = await uploadImageToR2(bucket, url, key);
				console.log(
					`----> LOG [Storage=R2] Uploaded photo ${i + 1}/${photoUrls.length} for ${toyCode}: ${r2Key}`,
				);

				return r2Key;
			} catch (error) {
				console.error(`Failed to upload photo ${i + 1} for ${toyCode}:`, error);
				// Fall back to original URL if upload fails
				return url;
			}
		});

		return Promise.all(uploadPromises);
	}

	// Upsert car into database
	private async upsertCar(
		data: HotWheelData,
		seriesIds: string[],
	): Promise<void> {
		if (!this.carsRepo || !this.carSeriesRepo) return;

		try {
			const toyCode = data.toy_num;
			const seriesNums = data.series_num.split("/");

			// Upload photos to R2 if bucket is available
			const photoUrls = this.bucket
				? await this.uploadPhotosToR2(data.photo_url, toyCode, data.year)
				: data.photo_url;

			const photoUrl = photoUrls[0];

			// Check cache first
			let car = this.existingCarsMap.get(toyCode);
			if (car) {
				console.log(`----> LOG [Cache] Car ${toyCode} found in cache!`);
			} else {
				// Upsert car using repository
				car = await this.carsRepo.upsert({
					toyCode,
					toyIndex: data.col_num,
					model: data.model,
					avatarUrl: photoUrl,
					year: data.year,
				});

				// Update cache
				this.existingCarsMap.set(toyCode, car);
				console.log(`----> LOG [DB] Car ${toyCode} upserted!`);
			}

			// Upsert car-series relationships for each series
			for (let i = 0; i < seriesIds.length; i++) {
				const carSeriesNum = seriesNums[i] || seriesNums[0] || data.series_num;
				await this.upsertCarSeries(
					car.id,
					seriesIds[i],
					Number.parseInt(carSeriesNum, 10) || 0,
				);
			}
		} catch (error) {
			console.error("Error upserting car:", error);
			throw error;
		}
	}

	// Upsert car-series relationship
	private async upsertCarSeries(
		carId: string,
		seriesId: string,
		index: number,
	): Promise<void> {
		if (!this.carSeriesRepo) return;

		try {
			const cacheKey = `${carId}-${seriesId}`;

			// Check cache first
			const cached = this.existingCarSeriesMap.get(cacheKey);
			if (cached) {
				console.log(`----> LOG [Cache] Car-Series relationship found in cache!`);
				return;
			}

			const carSeries = await this.carSeriesRepo.upsert({
				carId,
				seriesId,
				index,
			});

			// Update cache
			this.existingCarSeriesMap.set(cacheKey, carSeries);

			console.log(`----> LOG [DB] Car-Series relationship created/updated!`);
		} catch (error) {
			console.error("Error upserting car-series relationship:", error);
			throw error;
		}
	}

	async parse(url: string, year: string): Promise<void> {
		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142s.0.0.0 Safari/536.36",
				},
			});

			const html = await response.text();
			const document = parse(html) as Parse5Node;
			const results: HotWheelData[] = [];

			// Find all tables with class "wikitable"
			const tables = this.findElementsByClass(document, "wikitable");
			if (tables.length === 0) {
				throw new Error("No tables found");
			}
			for (const table of tables) {
				const tbody = this.findElementByTagName(table, "tbody");
				if (!tbody) continue;
				const rows = this.findElementsByTagName(tbody, "tr");
				const totalRows = rows.length;
				let index = 0;
				for (const row of rows) {
					console.log(
						`----> Log [Scraper] Processing ${index + 1}/${totalRows}`,
					);
					index++;

					const cells = this.findElementsByTagName(row, "td");
					if (cells.length >= 5) {
						const toyNum = this.getTextContent(cells[0]).trim();
						const colNum = this.getTextContent(cells[1]).trim();
						const model = this.getTextContent(cells[2]).trim();
						const series = this.getTextContent(cells[3])
							.trim()
							.split("\n")
							.filter((s) => s.trim());
						const seriesNum = this.getTextContent(cells[4]).trim();
						const photoUrl = this.findImageLinks(row);

						const hotWheelData: HotWheelData = {
							toy_num: toyNum,
							col_num: colNum,
							model: model,
							series: series,
							series_num: seriesNum,
							photo_url: photoUrl,
							year: String(year),
						};

						results.push(hotWheelData);

						// Upsert to database if db is available
						if (this.db && series && series.length > 0) {
							const seriesNums = seriesNum.split("/");
							const seriesIds: string[] = [];

							// Upsert each series and collect their IDs
							for (let i = 0; i < series.length; i++) {
								const seriesName = series[i];
								const seriesSeriesNum =
									seriesNums[i] ||
									seriesNums[seriesNums.length - 1] ||
									seriesNum;
								const seriesId = await this.upsertSeries(
									seriesName,
									seriesSeriesNum,
								);
								if (seriesId) {
									seriesIds.push(seriesId);
								}
							}

							// Upsert car with all series IDs
							if (seriesIds.length > 0) {
								await this.upsertCar(hotWheelData, seriesIds);
							}
						}
					}
				}
			}
		} catch (error) {
			console.error("Error scraping:", error);
			throw error;
		}
	}
}

export { ScrapeTableSpider };
