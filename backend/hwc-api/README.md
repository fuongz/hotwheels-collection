# Hot Wheels Collection - API

## Usage

1. Clone the repository: `git clone https://github.com/fuongz/hotwheels-collection.git`
2. Change directory: `cd backend/hwc-api`
3. Install dependencies: `bun install`
4. Run the server: `bun run dev`
5. Access the API: `http://localhost:8788`

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Run the server in development mode |
| `bun run deploy` | Deploy the server to Cloudflare Workers |
| `bun run db:migrate` | Run database migrations |
| `bun run db:studio` | Run database studio |
| `bun run db:generate` | Generate database schema |
| `bun run auth:generate` | Generate better-auth schemas |

## Cache Strategy

### Cache Keys and TTL

| Source File | Cache Key Pattern | TTL (seconds) | TTL (human) | Usage | Line Reference |
|-------------|-------------------|---------------|-------------|-------|----------------|
| **cars.ts** (route) | `user_car:{userId}:{carId}` | 86400 | 1 day | User car save duplicate check | [cars.ts:81](src/routes/cars.ts#L81) |
| **cars-repository.ts** | `user:{userId}:cars:{JSON.stringify({ page, limit, query })}` | 300 | 5 minutes | User's car list pagination | [cars-repository.ts:176](src/db/d1/repositories/cars-repository.ts#L176) |
| **cars-repository.ts** | `user:{userId}:cars:total:count` | 300 | 5 minutes | Total count of user's cars | [cars-repository.ts:213](src/db/d1/repositories/cars-repository.ts#L213) |
| **cars-repository.ts** | `collection:{collectionId}:{JSON.stringify({ page, limit, query })}` | 300 | 5 minutes | Cars by collection pagination | [cars-repository.ts:378](src/db/d1/repositories/cars-repository.ts#L378) |
| **cars-repository.ts** | `collection:{collectionId}:total:count` | 2,592,000 | 30 days | Total count of cars in collection | [cars-repository.ts:416](src/db/d1/repositories/cars-repository.ts#L416) |
| **cars-repository.ts** | `list:{JSON.stringify({ page, limit, query })}` | 86400 | 1 day | All cars pagination | [cars-repository.ts:497](src/db/d1/repositories/cars-repository.ts#L497) |
| **cars-repository.ts** | `cars:total:count` | 2,592,000 | 30 days | Total count of all cars | [cars-repository.ts:535](src/db/d1/repositories/cars-repository.ts#L535) |

### Summary by Route

#### /v1/cars
- **1 route-level cache** (user car saves)
- **4 repository-level caches** (car listings, user cars, counts)

#### /v1/series
- **No caching** in route
- **2 repository-level caches** (collection pagination, collection counts) via cars-repository.ts

#### /v1/me
- **No caching** in route
- **2 repository-level caches** (user car pagination, user car counts) via cars-repository.ts

### Cache TTL Strategy

**Short TTL (5 minutes = 300s)**
- User-specific car lists and filtered results
- Collection car lists with filters

**Medium TTL (1 day = 86,400s)**
- User car save records
- Main car listing pagination

**Long TTL (30 days = 2,592,000s)**
- Total car counts (rarely changes)
- Collection total counts (rarely changes)

## License

This project is licensed under the [MIT License](LICENSE).
