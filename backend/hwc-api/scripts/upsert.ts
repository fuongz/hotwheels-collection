import { DrizzleD1Database } from "drizzle-orm/d1";
import { inArray } from "drizzle-orm";
import { dbClient } from "../src/db/d1";
import { CarsRepository } from "../src/db/d1/repositories/cars-repository";
import { SeriesRepository } from "../src/db/d1/repositories/series-repository";
import { CarSeriesRepository } from "../src/db/d1/repositories/car-series-repository";
import { CacheService } from "../src/cache/kv/cache.service";
import { cars, series, carSeries } from "../src/db/d1/schema";

// -- helpers
import { generatePhotoKey, uploadImageToR2 } from "../src/storages/r2";

// D1 SQL variable limit is 100, so we need to batch operations
// Series has 3 columns (name, seriesNum, wikiSlug) = ~3 variables per row
// Cars has 6 columns = ~6 variables per row
// CarSeries has 3 columns = ~3 variables per row
const BATCH_SIZE_SERIES = 10; // 30 * 3 = 90 variables
const BATCH_SIZE_CARS = 10; // 15 * 6 = 90 variables
const BATCH_SIZE_CAR_SERIES = 10; // 30 * 3 = 90 variables
const BATCH_SIZE_QUERY = 90; // For inArray queries with single column

class UpsertCars {
  private db: DrizzleD1Database | undefined;
  private bucket?: R2Bucket;
  private cacheService?: CacheService;
  private carsRepo?: CarsRepository;
  private seriesRepo?: SeriesRepository;
  private carSeriesRepo?: CarSeriesRepository;

  constructor(env: CloudflareBindings) {
    if (env.DB) {
      this.db = dbClient(env.DB);
      this.carsRepo = new CarsRepository(env);
      this.seriesRepo = new SeriesRepository(this.db);
      this.carSeriesRepo = new CarSeriesRepository(this.db);
    }
    if (env.KV) {
      this.cacheService = new CacheService(env.KV);
    }

    this.bucket = env.BUCKET;
  }

  // Upload photos in the background without blocking
  private async uploadPhotosInBackground(items: HotWheelData[]): Promise<void> {
    if (!this.bucket) return;

    const bucket = this.bucket;
    let uploadedCount = 0;
    const totalPhotos = items.reduce((sum, item) => sum + item.photo_url.length, 0);

    console.log(`----> LOG [Background] Uploading ${totalPhotos} photos for ${items.length} cars...`);

    // Upload all photos in parallel
    const uploadPromises = items.flatMap(item =>
      item.photo_url.map(async (url, i) => {
        try {
          const key = generatePhotoKey(item.toy_num, item.year, i, url);
          await uploadImageToR2(bucket, url, key);
          uploadedCount++;
          if (uploadedCount % 10 === 0) {
            console.log(`----> LOG [Background] Progress: ${uploadedCount}/${totalPhotos} photos uploaded`);
          }
        } catch (error) {
          console.error(`----> ERROR [Background] Failed to upload photo for ${item.toy_num}:`, error);
        }
      })
    );

    await Promise.all(uploadPromises);
    console.log(`----> LOG [Background] ✓ Completed uploading ${uploadedCount}/${totalPhotos} photos`);
  }

  // Bulk upsert series - extracts unique series and inserts in batches
  private async bulkUpsertSeries(
    items: HotWheelData[],
    overwrite: boolean
  ): Promise<Map<string, string>> {
    if (!this.seriesRepo || !this.db) throw new Error("SeriesRepo or DB not initialized");

    // Extract unique series using Set
    const uniqueSeries = new Set<string>();
    const seriesDataMap = new Map<string, { seriesNum: string; wikiSlug: string }>();

    for (const item of items) {
      // Parse series_num to extract total count (last part after "/")
      const seriesNumParts = item.series_num.split("/");
      const totalCars = seriesNumParts[seriesNumParts.length - 1] || "";

      for (const seriesItem of item.series) {
        if (!uniqueSeries.has(seriesItem.name)) {
          uniqueSeries.add(seriesItem.name);
          seriesDataMap.set(seriesItem.name, {
            seriesNum: totalCars,
            wikiSlug: seriesItem.slug
          });
        }
      }
    }

    // Build array for bulk insert
    const seriesArray = Array.from(uniqueSeries).map(name => ({
      name,
      seriesNum: seriesDataMap.get(name)?.seriesNum || "",
      wikiSlug: seriesDataMap.get(name)?.wikiSlug || ""
    }));

    if (seriesArray.length === 0) {
      console.log("----> LOG [Bulk] No series to upsert");
      return new Map<string, string>();
    }

    // Bulk insert series in batches to respect D1's 100 variable limit
    for (let i = 0; i < seriesArray.length; i += BATCH_SIZE_SERIES) {
      const batch = seriesArray.slice(i, i + BATCH_SIZE_SERIES);
      await this.db.insert(series)
        .values(batch)
        .onConflictDoUpdate({
          target: series.name,
          set: { updatedAt: new Date() }
        });
      console.log(`----> LOG [Bulk] Upserted series batch ${Math.floor(i / BATCH_SIZE_SERIES) + 1}/${Math.ceil(seriesArray.length / BATCH_SIZE_SERIES)} (${batch.length} items)`);
    }

    // Fetch all series to build ID map
    const allSeries = await this.seriesRepo.getAll();
    const seriesMap = new Map<string, string>();
    for (const s of allSeries) {
      seriesMap.set(s.name, s.id);
    }

    console.log(`----> LOG [Bulk] Upserted ${seriesArray.length} series total`);
    return seriesMap;
  }

  // Bulk upsert cars - generates photo keys and inserts immediately, then uploads async
  private async bulkUpsertCars(
    items: HotWheelData[],
    overwrite: boolean,
    noPhotos: boolean
  ): Promise<Map<string, string>> {
    if (!this.carsRepo || !this.db) throw new Error("CarsRepo or DB not initialized");

    // Generate photo keys immediately without waiting for uploads
    console.log(`----> LOG [Bulk] Generating photo keys for ${items.length} cars...`);
    const photoKeys = items.map(item => {
      if (!this.bucket || item.photo_url.length === 0) {
        return item.photo_url;
      }
      // Generate R2 keys using the same naming format
      return item.photo_url.map((url, i) =>
        `r2://${generatePhotoKey(item.toy_num, item.year, i, url)}`
      );
    });

    // Build cars array with generated photo keys (not yet uploaded)
    const carsArray = items.map((item, index) => ({
      toyCode: item.toy_num,
      toyIndex: item.col_num,
      model: item.model.name,
      wikiSlug: item.model.slug,
      avatarUrl: photoKeys[index][0],
      year: item.year
    }));

    if (carsArray.length === 0) {
      console.log("----> LOG [Bulk] No cars to upsert");
      return new Map<string, string>();
    }

    // Bulk insert cars in batches to respect D1's 100 variable limit
    for (let i = 0; i < carsArray.length; i += BATCH_SIZE_CARS) {
      const batch = carsArray.slice(i, i + BATCH_SIZE_CARS);
      await this.db.insert(cars)
        .values(batch)
        .onConflictDoUpdate({
          target: cars.toyCode,
          set: {
            toyIndex: cars.toyIndex,
            model: cars.model,
            wikiSlug: cars.wikiSlug,
            avatarUrl: cars.avatarUrl,
            year: cars.year,
            updatedAt: new Date()
          }
        });
      console.log(`----> LOG [Bulk] Upserted cars batch ${Math.floor(i / BATCH_SIZE_CARS) + 1}/${Math.ceil(carsArray.length / BATCH_SIZE_CARS)} (${batch.length} items)`);
    }

    // Fetch all cars in batches to build ID map
    const carsMap = new Map<string, string>();
    const toyCodes = items.map(i => i.toy_num);

    for (let i = 0; i < toyCodes.length; i += BATCH_SIZE_QUERY) {
      const batch = toyCodes.slice(i, i + BATCH_SIZE_QUERY);
      const batchCars = await this.db
        .select()
        .from(cars)
        .where(inArray(cars.toyCode, batch))
        .all();

      for (const car of batchCars) {
        carsMap.set(car.toyCode, car.id);
      }
    }

    console.log(`----> LOG [Bulk] Upserted ${carsArray.length} cars total`);

    // Upload photos asynchronously in the background (don't wait)
    if (this.bucket && !noPhotos) {
      console.log(`----> LOG [Bulk] Starting async photo uploads for ${items.length} cars...`);
      this.uploadPhotosInBackground(items).catch((error: unknown) => {
        console.error("----> ERROR [Bulk] Background photo upload failed:", error);
      });
    }

    return carsMap;
  }

  // Bulk upsert car-series relationships - builds relationships and inserts in batches
  private async bulkUpsertCarSeries(
    items: HotWheelData[],
    seriesMap: Map<string, string>,
    carsMap: Map<string, string>
  ): Promise<void> {
    if (!this.carSeriesRepo || !this.db) throw new Error("CarSeriesRepo or DB not initialized");

    // Build car-series relationships array
    const carSeriesArray: Array<{
      carId: string;
      seriesId: string;
      index: number;
    }> = [];

    for (const item of items) {
      const carId = carsMap.get(item.toy_num);
      if (!carId) continue;

      // Parse series_num: "123/456" -> index=123, total=456
      const seriesNumParts = item.series_num.split("/");
      const carIndex = seriesNumParts[0] || "0"; // First part is the car's index in series

      for (let i = 0; i < item.series.length; i++) {
        const seriesId = seriesMap.get(item.series[i].name);
        if (!seriesId) continue;

        carSeriesArray.push({
          carId,
          seriesId,
          index: Number.parseInt(carIndex, 10) || 0
        });
      }
    }

    if (carSeriesArray.length === 0) {
      console.log("----> LOG [Bulk] No car-series relationships to insert");
      return;
    }

    // Delete existing car-series relationships for these cars in batches to avoid duplicates
    const carIds = Array.from(carsMap.values());
    if (carIds.length > 0) {
      for (let i = 0; i < carIds.length; i += BATCH_SIZE_QUERY) {
        const batch = carIds.slice(i, i + BATCH_SIZE_QUERY);
        await this.db
          .delete(carSeries)
          .where(inArray(carSeries.carId, batch))
          .execute();
      }
      console.log(`----> LOG [Bulk] Deleted existing car-series relationships for ${carIds.length} cars`);
    }

    // Bulk insert car-series relationships in batches
    for (let i = 0; i < carSeriesArray.length; i += BATCH_SIZE_CAR_SERIES) {
      const batch = carSeriesArray.slice(i, i + BATCH_SIZE_CAR_SERIES);
      await this.db.insert(carSeries)
        .values(batch)
        .execute();
      console.log(`----> LOG [Bulk] Inserted car-series batch ${Math.floor(i / BATCH_SIZE_CAR_SERIES) + 1}/${Math.ceil(carSeriesArray.length / BATCH_SIZE_CAR_SERIES)} (${batch.length} items)`);
    }

    console.log(`----> LOG [Bulk] Inserted ${carSeriesArray.length} car-series relationships total`);
  }

  async getFromCache(year: string) {
    if (!this.cacheService) return;

    // Get metadata about chunks
    const meta = await this.cacheService.get<{
      totalChunks: number;
      totalItems: number;
      chunkSize: number;
    }>(`scrape:results:${year}:meta`);

    if (!meta) {
      console.log(
        `----> LOG [Cache] No metadata found for year ${year} in cache!`
      );
      return;
    }

    console.log(
      `----> LOG [Cache] Found ${meta.totalChunks} chunks with ${meta.totalItems} total items for year ${year}`
    );

    let items = [];

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < meta.totalChunks; chunkIndex++) {
      console.log(
        `----> LOG [Processing] Chunk ${chunkIndex + 1}/${meta.totalChunks}`
      );
      // Fetch chunk from cache
      const hotWheelData = await this.cacheService.get<HotWheelData[]>(
        `scrape:results:${year}:chunk:${chunkIndex}`
      );
      if (!hotWheelData || hotWheelData.length === 0) {
        console.log(
          `----> LOG [Cache] No data found for chunk ${chunkIndex} of year ${year}`
        );
        continue;
      }
      items.push(...hotWheelData);
      console.log(
        `----> LOG [Processing] Completed chunk ${chunkIndex + 1}/${
          meta.totalChunks
        }`
      );
    }
    console.log(
      `----> LOG [Processing] Completed all ${meta.totalChunks} chunks for year ${year}`
    );
    return items;
  }

  async run(year: string, overwrite: boolean = false) {
    const items = await this.getFromCache(year);
    if (!items || items.length === 0) {
      console.log(`----> LOG [Bulk] No items found for year ${year}`);
      return;
    }
    console.log(`----> LOG [Bulk] Starting bulk upsert for ${items.length} items from year ${year}`);
    try {
      // Phase 1: Bulk upsert series
      const seriesMap = await this.bulkUpsertSeries(items, overwrite);

      // Phase 2: Bulk upsert cars (includes parallel R2 uploads)
      const carsMap = await this.bulkUpsertCars(items, overwrite, false);

      // Phase 3: Bulk upsert car-series relationships
      await this.bulkUpsertCarSeries(items, seriesMap, carsMap);

      console.log(`----> LOG [Bulk] ✓ Completed bulk upsert for ${items.length} cars from year ${year}`);
    } catch (error) {
      console.error(`----> ERROR [Bulk] Failed to upsert items for year ${year}:`, error);
      throw error;
    }
  }
}

export { UpsertCars };
