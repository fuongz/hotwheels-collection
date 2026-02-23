import { CacheService } from "../../cache/kv/cache.service";
import { HTMLParser } from "../base";
import type { Parse5Node } from "../index";
import type { HotWheelData, TableRowData } from "./types";
import { generateSlug, generateTitle } from "./utils";

export class FandomProvider {
	private cacheService: CacheService | null = null;
	private providerUri = "https://hotwheels.fandom.com/wiki/";

	constructor(env: CloudflareBindings) {
		if (env.KV) {
			this.cacheService = new CacheService(env.KV);
		}
	}

	async getCar(slug: string): Promise<HotWheelData> {
		const cars = await this.parse(slug);
		return cars;
	}

	/**
	 * Parse table data from the wiki page
	 */
	private parseTableData(document: HTMLParser): TableRowData[] {
		const variations: TableRowData[] = [];

		// Find the table with class "wikitable sortable"
		const tables = document.findElementsByClass("wikitable");
		if (tables.length === 0) return variations;

		const table = tables[0];

		// Find tbody element
		const tbody = document.findElementsByTagName("tbody", table);
		if (tbody.length === 0) return variations;

		// Get all rows in tbody
		const rows = document.findElementsByTagName("tr", tbody[0]);

		for (const row of rows) {
			const cells = document.findElementsByTagName("td", row);
			if (cells.length === 0) continue; // Skip header rows

			const baseColor = this.extractCellText(document, cells[5]);
			const baseColorArr = baseColor.split("/");
			const colNumArr = this.extractCellText(document, cells[0]).split("/");
			const colNum = parseInt(colNumArr[0], 10);
			const year = this.extractCellText(document, cells[1]);
			const notes = this.extractCellText(document, cells[11]);

			let baseCode: string[] = [];
			if (notes.includes("code(s): ")) {
				baseCode = notes
					.split("code(s): ")[1]
					.split(",")
					.map((code) => code.trim());
			}

			// Extract data from each cell
			const rowData: TableRowData = {
				col_num: colNum,
				year: Number(year),
				series: this.extractSeriesCell(document, cells[2], !colNum),
				color: this.extractCellText(document, cells[3]),
				tampo: this.extractCellText(document, cells[4]),
				base_color: baseColorArr[0] || null,
				base_type: baseColorArr[1] || null,
				window_color: this.extractCellText(document, cells[6]),
				interior_color: this.extractCellText(document, cells[7]),
				wheel_type: this.extractCellText(document, cells[8]),
				toy_num: this.extractCellText(document, cells[9]),
				country: this.extractCellText(document, cells[10]),
				notes,
				base_codes: baseCode,
				photo_url: this.extractImageUrl(document, cells[12]),
			};
			variations.push(rowData);
		}
		return variations;
	}

	private extractSeriesCell(
		document: HTMLParser,
		cell: Parse5Node,
		isSilverSeries: boolean,
	): {
		name: string | null;
		slug: string | null;
		type: "premium" | "mainline" | "silver" | "rlc" | null;
		childName: string | null;
		childSlug: string | null;
		seriesNum: number | null;
		year: number | null;
		carIndex: number | null;
	} {
		if (!cell)
			return {
				name: null,
				slug: null,
				type: null,
				childName: null,
				childSlug: null,
				seriesNum: null,
				carIndex: null,
				year: null,
			};

		const series = document.findElementsByTagName("a", cell);
		const seriesTitle = document.getAttribute(series[0], "title");
		let seriesName = document.getTextContent(series[0]);
		if (seriesName.includes(" : ")) {
			seriesName = seriesName.split(" : ")[1];
		}
		const seriesSlug = generateSlug(seriesTitle);
		const seriesHash = document.getAttribute(series[0], "href").split("#")[1];

		const seriesNumText = document.getTextContent(cell);

		let seriesNum: number | null = null;
		let carIndex: number | null = null;

		if (seriesNumText) {
			const match = seriesNumText.match(/(\d+)\/(\d+)/);
			if (match) {
				seriesNum = parseInt(match[2], 10);
				carIndex = parseInt(match[1], 10);
			}
		}
		const checkSlugHaveYear = seriesSlug.match(/\b(19|20)\d{2}\b/g);
		const seriesSlugLowercase = seriesSlug.toLowerCase();
		let type: "premium" | "mainline" | "silver" | "rlc" | null = null;
		if (seriesSlugLowercase.includes("premium")) {
			type = "premium";
		} else if (
			seriesSlugLowercase.includes("red line") ||
			seriesSlugLowercase.includes("rlc")
		) {
			type = "rlc";
		} else if (isSilverSeries) {
			type = "silver";
		} else {
			type = "mainline";
		}
		return {
			name: seriesName,
			slug: seriesSlug,
			type,
			childName: generateTitle(seriesHash),
			childSlug: seriesHash,
			seriesNum,
			carIndex,
			year: checkSlugHaveYear ? parseInt(checkSlugHaveYear[0], 10) : null,
		};
	}

	/**
	 * Extract clean text from a table cell
	 */
	private extractCellText(document: HTMLParser, cell: Parse5Node): string {
		if (!cell) return "";
		return document
			.getTextContent(cell)
			.trim()
			.replace(/\n/g, " ")
			.replace(/\s+/g, " ");
	}

	/**
	 * Extract image URL from a table cell
	 */
	private extractImageUrl(document: HTMLParser, cell: Parse5Node): string {
		if (!cell) return "";

		// Look for img tag in the cell
		const imgs = document.findElementsByTagName("a", cell, true);

		if (imgs.length === 0) return "";

		// Get the src attribute
		const src = document.getHref(imgs[0]);
		return src;
	}

	async parse(slug: string): Promise<HotWheelData> {
		try {
			// -- create cache key for the HTML response
			const htmlCacheKey = `fandom:html:${slug}`;
			const url = `${this.providerUri}${slug}`;

			// -- try to get HTML from cache first
			let html: string | null = null;
			if (this.cacheService) {
				html = await this.cacheService.get<string>(htmlCacheKey);
				if (html) {
					console.log(
						`----> LOG [Cache] HTML for slug ${slug} found in cache!`,
					);
				}
			}

			// -- if not in cache, fetch from URL
			if (!html) {
				const response = await fetch(url, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142s.0.0.0 Safari/536.36",
					},
				});

				html = await response.text();

				// Cache the HTML response
				if (this.cacheService) {
					await this.cacheService.set(htmlCacheKey, html);
					console.log(`----> LOG [Cache] HTML for slug ${slug} cached!`);
				}
			}

			const document = new HTMLParser(html);

			// -- parsed
			const overviewNodes = document.findElementsByDataAttribute(
				"aside",
				"role",
				"region",
			);

			// Extract only serializable data from Parse5 nodes
			const carName = document.findElementsByTagName("h2", overviewNodes[0]);
			const designer = document.findElementsByDataAttribute(
				"div",
				"data-source",
				"designer",
			);
			const carCode = document.findElementsByDataAttribute(
				"div",
				"data-source",
				"number",
			);
			const designerText = document
				.getTextContent(designer[0])
				.split("\n\t\n\t")[2]
				.replaceAll("\t", "")
				.replaceAll("\n", "");
			const carCodeText = document
				.getTextContent(carCode[0])
				.split("\n\t\n\t")[2]
				.replaceAll("\t", "")
				.replaceAll("\n", "");

			// -- main image
			const mainImage = document.findElementsBySelector("a", overviewNodes[0]);

			// -- year
			const yearWrapper = document.findElementsByDataAttribute(
				"div",
				"data-source",
				"years",
			);
			const yearElements = document
				.getTextContent(yearWrapper[0])
				.replaceAll("\n\t\n\t\tProduced\n\t\n\t", "")
				.replaceAll("\t", "")
				.replaceAll("\n", "")
				.split(" - ");

			// -- series
			const seriesWrapper = document.findElementsByDataAttribute(
				"div",
				"data-source",
				"series",
			);
			const seriesElements = document.findElementsByTagName(
				"div",
				seriesWrapper[0],
			);
			const series = document.findElementsByTagName("a", seriesElements[0]);
			let seriesName = document.getTextContent(series[0]);
			const seriesTitle = document.getAttribute(series[0], "title");
			const seriesSlug = generateSlug(seriesTitle);
			const seriesHash = document.getAttribute(series[0], "href").split("#")[1];
			if (seriesName.includes(" : ")) {
				const seriesNameArr = seriesName.split(" : ");
				seriesName = seriesNameArr[0];
			}

			// -- description extraction
			const descriptionDivs =
				document.findContentBetweenHeaders(".mw-parser-output");

			// -- parse table data for variations
			const variations = this.parseTableData(document);

			return {
				model: {
					name: document.getTextContent(carName[0]),
					slug,
					code: carCodeText,
				},
				designer: {
					name: designerText,
					slug: generateSlug(designerText),
				},
				year: {
					producer_from: parseInt(yearElements[0], 10),
					producer_to:
						yearElements[1] === "Present"
							? null
							: parseInt(yearElements[1], 10),
				},
				debut_series: {
					name: seriesName,
					slug: seriesSlug,
					childName: generateTitle(seriesHash),
					childSlug: seriesHash,
				},
				description: descriptionDivs,
				photo_url: [document.getHref(mainImage[0])],
				variations,
			};
		} catch (error) {
			console.error("Error scraping:", error);
			throw error;
		}
	}
}

export * from "./utils";
