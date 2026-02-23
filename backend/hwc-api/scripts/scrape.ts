import { parse } from "parse5";
import { CacheService } from "../src/cache/kv/cache.service";

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
class ScrapeTableSpider {
  private cacheService?: CacheService;

  constructor(env: CloudflareBindings) {
    if (env.KV) {
      this.cacheService = new CacheService(env.KV);
    }
  }

  async startRequests(year: string): Promise<Record<string, HotWheelData[]>> {
    // Load existing data into cache to avoid repeated DB queries
    // await this.loadExistingDataToCache(year);
    const response: Record<string, HotWheelData[]> = {};
    const urls = [
      `https://hotwheels.fandom.com/wiki/List_of_${year}_Hot_Wheels`,
    ];
    for (const url of urls) {
      const result = await this.parse(url, year);
      response[url] = result;
    }
    return response;
  }

  // Helper method to check if a node is an Element
  private isElement(node: Parse5Node): boolean {
    return node.nodeName !== "#text" && node.nodeName !== "#comment";
  }

  // Find elements by class name
  private findElementsByClass(
    node: Parse5Node,
    className: string
  ): Parse5Node[] {
    const results: Parse5Node[] = [];

    const traverse = (currentNode: Parse5Node) => {
      if (this.isElement(currentNode)) {
        const attrs = currentNode.attrs || [];
        const classAttr = attrs.find(
          (attr: { name: string; value: string }) => attr.name === "class"
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
    tagName: string
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
    tagName: string
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
          (attr: { name: string; value: string }) => attr.name === "class"
        );
        const hrefAttr = attrs.find(
          (attr: { name: string; value: string }) => attr.name === "href"
        );
        if (classAttr?.value.includes("image") && hrefAttr) {
          // Filter out images containing "Image_Not_Available"
          if (!hrefAttr.value.includes("Image_Not_Available")) {
            links.push(hrefAttr.value);
          }
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

  // Extract model data from the model cell
  private extractModel(node: Parse5Node): ModelData {
    // Try to find an anchor tag first
    let anchorFound = false;
    let modelData: ModelData = { name: "", slug: null };

    const findAnchor = (currentNode: Parse5Node) => {
      if (
        this.isElement(currentNode) &&
        currentNode.nodeName === "a" &&
        !anchorFound
      ) {
        const attrs = currentNode.attrs || [];
        const hrefAttr = attrs.find(
          (attr: { name: string; value: string }) => attr.name === "href"
        );

        if (hrefAttr?.value.startsWith("/wiki/")) {
          anchorFound = true;
          // Extract slug from href
          const slug = hrefAttr.value.replace(/^\/wiki\//, "");
          // Get the full text content of the cell (includes anchor text + any additional text)
          const fullText = this.getTextContent(node).trim();

          modelData = {
            name: fullText,
            slug: decodeURIComponent(slug),
          };
          return;
        }
      }

      const children = currentNode.childNodes || [];
      for (const child of children) {
        if (this.isElement(child) && !anchorFound) {
          findAnchor(child);
        }
      }
    };

    findAnchor(node);

    // If no anchor found, just get the text content
    if (!anchorFound) {
      modelData = {
        name: this.getTextContent(node).trim(),
        slug: null,
      };
    }

    return modelData;
  }

  // Extract series from anchor tags in the series cell
  private extractSeries(node: Parse5Node): SeriesData[] {
    const series: SeriesData[] = [];

    const findAnchors = (currentNode: Parse5Node) => {
      if (this.isElement(currentNode) && currentNode.nodeName === "a") {
        const attrs = currentNode.attrs || [];
        const hrefAttr = attrs.find(
          (attr: { name: string; value: string }) => attr.name === "href"
        );
        const textContent = this.getTextContent(currentNode).trim();

        if (textContent && hrefAttr) {
          // Extract slug from href (e.g., "/wiki/HW_Wagons_Mini_Collection_(2025)" -> "HW_Wagons_Mini_Collection_(2025)")
          const slug = hrefAttr.value.replace(/^\/wiki\//, "");

          // Check if this series already exists in the array
          const exists = series.some((s) => s.slug === slug);
          if (!exists) {
            series.push({
              name: textContent,
              slug: decodeURIComponent(slug),
            });
          }
        }
      }

      const children = currentNode.childNodes || [];
      for (const child of children) {
        if (this.isElement(child)) {
          findAnchors(child);
        }
      }
    };

    findAnchors(node);
    return series;
  }

  async parse(url: string, year: string): Promise<HotWheelData[]> {
    try {
      // -- create cache key for the HTML response
      const htmlCacheKey = `scrape:html:${year}`;

      // -- try to get HTML from cache first
      let html: string | null = null;
      if (this.cacheService) {
        html = await this.cacheService.get<string>(htmlCacheKey);
        if (html) {
          console.log(
            `----> LOG [Cache] HTML for year ${year} found in cache!`
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
          console.log(`----> LOG [Cache] HTML for year ${year} cached!`);
        }
      }

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
            `----> Log [Scraper] Processing ${index + 1}/${totalRows}`
          );
          index++;

          const cells = this.findElementsByTagName(row, "td");
          if (cells.length >= 5) {
            const toyNum = this.getTextContent(cells[0]).trim();
            const colNum = this.getTextContent(cells[1]).trim();
            const model = this.extractModel(cells[2]);
            const series = this.extractSeries(cells[3]);
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
          }
        }
      }
      console.log("----> Log [Scraper] Done!");
      if (this.cacheService) {
        // Split results into chunks of 50 items
        const chunkSize = 20;
        const chunks: HotWheelData[][] = [];
        for (let i = 0; i < results.length; i += chunkSize) {
          chunks.push(results.slice(i, i + chunkSize));
        }

        // Store each chunk with an indexed key
        for (let i = 0; i < chunks.length; i++) {
          await this.cacheService.set(`scrape:results:${year}:chunk:${i}`, chunks[i]);
          console.log(`----> LOG [Cache] Results chunk ${i + 1}/${chunks.length} for year ${year} cached!`);
        }

        // Store metadata about the chunks
        await this.cacheService.set(`scrape:results:${year}:meta`, {
          totalChunks: chunks.length,
          totalItems: results.length,
          chunkSize,
        });
        console.log(`----> LOG [Cache] Total ${chunks.length} chunks for year ${year} cached!`);
      }
      return results;
    } catch (error) {
      console.error("Error scraping:", error);
      throw error;
    }
  }
}

export { ScrapeTableSpider };
