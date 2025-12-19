export class CacheService {
	private kv: KVNamespace;
	private defaultTtl: number = 60 * 5;

	constructor(kv: KVNamespace) {
		this.kv = kv;
	}

	private getCacheKey(key: string, version: string = "v1"): string {
		return `${version}:cars:${key}`;
	}

	async get<T>(key: string): Promise<T | null> {
		try {
			const cached = await this.kv.get(this.getCacheKey(key), "json");
			return cached as T | null;
		} catch (error) {
			console.error("----> ERR [CACHE] get:", error);
			return null;
		}
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		try {
			await this.kv.put(this.getCacheKey(key), JSON.stringify(value), {
				expirationTtl: ttl || this.defaultTtl,
			});
		} catch (error) {
			console.error("----> ERR [CACHE] set:", error);
		}
	}

	async del(key: string): Promise<void> {
		try {
			await this.kv.delete(this.getCacheKey(key));
		} catch (error) {
			console.error("----> ERR [CACHE] delete:", error);
		}
	}

	async delByPrefix(prefix: string): Promise<void> {
		try {
			const { keys } = await this.kv.list({ prefix: this.getCacheKey(prefix) });
			// Delete in batches
			await Promise.all(keys.map((key) => this.kv.delete(key.name)));
		} catch (error) {
			console.error("----> ERR [CACHE] deleteByPrefix:", error);
		}
	}

	async invalidateAllCars(): Promise<void> {
		try {
			await this.delByPrefix("list:");
			await this.delByPrefix("cars:");
		} catch (error) {
			console.error("----> ERR [CACHE] invalidateAllCars:", error);
		}
	}

	async invalidateCar(carId: string): Promise<void> {
		try {
			await this.del(`cars:${carId}`);
		} catch (error) {
			console.error("----> ERR [CACHE] invalidateCar:", error);
		}
	}
}
