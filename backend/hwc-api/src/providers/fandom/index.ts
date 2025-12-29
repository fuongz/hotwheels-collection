import { CacheService } from "../../cache/kv/cache.service";
import { HTMLParser } from "../base";
import type { HotWheelData } from "./types";

export class FandomProvider {
	private cacheService: CacheService | null = null;
	private providerUri = "https://hotwheels.fandom.com/wiki/";

	constructor(env: CloudflareBindings) {
		if (env.KV) {
			this.cacheService = new CacheService(env.KV);
		}
	}

	async getCar(slug: string): Promise<any> {
		const cars = await this.parse(slug);
		return cars;
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
			const _results: HotWheelData[] = [];

			// -- parsed
			const overviewNodes = document.findElementsByDataAttribute(
				"aside",
				"role",
				"region",
			);

			// Extract only serializable data from Parse5 nodes
			const carName = document.findElementsByTagName("h2", overviewNodes[0]);

			return {
				model: {
					name: document.getTextContent(carName[0]),
					slug,
				},
				year: document.getTextContent(
					document.findElementsByTagName("span", carName[0])[0],
				),
				toy_num: "",
				col_num: "",
				series: [],
				series_num: "",
				photo_url: [],
			};
		} catch (error) {
			console.error("Error scraping:", error);
			throw error;
		}
	}
}

export * from "./utils";
