# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hot Wheels Collection API is a Cloudflare Workers application built with Hono that provides a REST API for managing Hot Wheels car collections. The API scrapes car data from the Hot Wheels Fandom wiki and stores it in Cloudflare D1 (SQLite), with caching via Cloudflare KV and image storage via Cloudflare R2 or Cloudinary.

## Tech Stack

- **Runtime**: Cloudflare Workers (uses `wrangler` for development and deployment)
- **Framework**: Hono (web framework)
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2 + Cloudinary (for images)
- **Auth**: better-auth with Google OAuth2 and email/password
- **Package Manager**: Bun
- **Validation**: Zod with `@hono/zod-validator`
- **Linting/Formatting**: Biome (tabs, double quotes, auto-organize imports)

## Development Commands

```bash
# Development
bun install                    # Install dependencies
bun run dev                    # Start dev server at localhost:8788

# Database
bun run db:generate            # Generate migrations from schema changes
bun run db:migrate             # Apply migrations to D1
bun run db:studio              # Open Drizzle Studio (database GUI)

# Deployment
bun run deploy                 # Deploy to Cloudflare Workers (with minification)

# Code Quality
npx @biomejs/biome check       # Lint and format check
npx @biomejs/biome check --write  # Auto-fix issues

# Auth & Types
bun run auth:generate          # Generate better-auth schemas
bun run cf-typegen             # Generate Cloudflare bindings types

# Secrets (Local Development)
bun run local:secrets:create   # Create local secrets (see wrangler.jsonc for bindings)
```

## Architecture

### Directory Structure

```
src/
├── index.ts                   # App entry point, CORS setup, route registration
├── types.ts                   # Global type definitions (App, AuthVariables)
├── auth/                      # better-auth configuration
│   └── index.ts              # Auth setup with Drizzle adapter, Google OAuth
├── routes/                    # Hono route handlers
│   ├── cars.ts               # Car endpoints (list, save, delete)
│   ├── series.ts             # Series/collection endpoints
│   ├── me.ts                 # User-specific endpoints
│   └── admin.ts              # Admin-only endpoints
├── middlewares/               # Hono middlewares
│   ├── auth-middleware.ts    # authMiddleware, optionalAuthMiddleware
│   └── admin-middleware.ts   # Admin role checking
├── db/d1/                     # Database layer
│   ├── schema.ts             # Main Drizzle schema (series, cars, carVersions, etc.)
│   ├── schemas/auth.ts       # better-auth generated schemas
│   ├── index.ts              # Database connection helper
│   └── repositories/          # Data access layer (repository pattern)
│       ├── cars-repository.ts
│       ├── series-repository.ts
│       ├── user-cars-repository.ts
│       └── car-series-repository.ts
├── cache/kv/                  # KV caching layer
│   └── cache.service.ts      # CacheService with prefix-based keys
├── providers/                 # External data providers
│   ├── base.ts               # HTMLParser utility (parse5 wrapper)
│   └── fandom/               # Hot Wheels Fandom wiki scraper
│       ├── index.ts          # FandomProvider class
│       ├── types.ts          # Scraping type definitions
│       └── utils.ts          # Slug/title generation utilities
└── storages/                  # File storage integrations
    ├── cloudinary/           # Cloudinary image uploads
    └── r2/                   # Cloudflare R2 storage
```

### Key Database Schema Relationships

- **series**: Hot Wheels series/collections (e.g., "2024 Mainline", "Fast & Furious")
- **designers**: Car designers with tenure info
- **cars**: Car models with designer and debut series references
- **carVersions**: Specific car variations (color, tampo, wheel type, year)
- **carSeries**: Junction table linking carVersions to series (many-to-many)
- **userCars**: User's saved cars with quantity and notes

All tables use custom nanoid prefixes (e.g., `car_`, `series_`, `designer_`) for IDs.

### Authentication Flow

1. Auth routes are mounted at `/api/auth/*` (handled by better-auth)
2. Uses Drizzle adapter with D1 database
3. Rate limiting stored in KV (`secondaryStorage`)
4. IP detection via Cloudflare's `cf-connecting-ip` header
5. Middlewares:
   - `authMiddleware`: Requires valid session, sets `user` and `session` in context
   - `optionalAuthMiddleware`: Sets user if authenticated, continues otherwise
   - `adminMiddleware`: Checks for admin role

### Caching Strategy

The app uses Cloudflare KV for caching with different TTLs based on data volatility:

- **Short TTL (5 min)**: User car lists, filtered results
- **Medium TTL (1 day)**: General car listings, user save records
- **Long TTL (30 days)**: Total counts (rarely change)

Cache keys follow patterns like:
- `v1:cars:user:{userId}:cars:{filters}`
- `v1:cars:collection:{collectionId}:{filters}`
- `v1:cars:user_car:{userId}:{carVersionId}`

**Repository pattern**: All cache logic is encapsulated in repository classes, NOT in route handlers.

### Fandom Scraper

The `FandomProvider` class scrapes Hot Wheels data from `hotwheels.fandom.com/wiki/{slug}`:
1. Fetches HTML (caches raw HTML in KV to avoid re-fetching)
2. Parses with custom `HTMLParser` (parse5 wrapper)
3. Extracts car metadata, designer, production years, series, and variations table
4. Returns structured data for database insertion

Key methods:
- `parse(slug)`: Main scraper entry point
- `parseTableData()`: Extracts car variations from wiki tables
- `extractSeriesCell()`: Parses series info with series number and index

## Environment Variables & Bindings

Defined in `wrangler.jsonc`:

**Secrets Store Bindings** (accessed via `env.BINDING_NAME.get()`):
- `BETTER_AUTH_SECRET`: Auth secret key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` / `CLOUDINARY_CLOUD_NAME`

**Cloudflare Bindings**:
- `DB`: D1 database binding
- `KV`: KV namespace for caching
- `BUCKET`: R2 bucket for file storage

**Runtime Variables** (set via wrangler or .dev.vars):
- `FRONTEND_URL`: CORS origin (e.g., "http://localhost:3000")
- `BETTER_AUTH_URL`: Auth base URL (e.g., "http://localhost:8788/api/auth")

## Code Style & Patterns

### Biome Configuration
- Use **tabs** for indentation (configured in biome.json)
- Use **double quotes** for strings
- Auto-organize imports on save
- No explicit `any` warnings (disabled for this project)

### Route Handlers
1. Use Zod validation with `zValidator` for query/body params
2. Extract validated data via `req.valid("query")` or `req.valid("json")`
3. Get user from context: `const user = c.get("user")`
4. Return JSON responses: `c.json({ data }, statusCode)`
5. Wrap in try-catch, return errors as `c.json({ error: err.message }, 500)`

### Repository Pattern
- All database operations go through repository classes (e.g., `CarsRepository`)
- Repositories handle caching logic internally
- Use Drizzle ORM for all queries
- Always use prepared statements and proper indexing

### Migration Workflow
1. Update schema in `src/db/d1/schema.ts`
2. Run `bun run db:generate` to create migration SQL
3. Review generated migration in `drizzle/migrations/`
4. Run `bun run db:migrate` to apply to D1
5. For auth schemas: run `bun run auth:generate` after modifying auth config

### Error Handling
- Always wrap route handlers in try-catch
- Log errors with `console.log()` or `console.error()`
- Return structured JSON errors: `{ error: string, httpStatus?: number }`
- Don't expose internal error details to clients

## Testing & Deployment

**No test suite currently exists** - when adding features, test manually via:
1. `bun run dev` to start local server
2. Use HTTP client (curl, Postman, etc.) to test endpoints
3. Check `.wrangler/state` for local D1 database and KV data

**Deployment**:
- `bun run deploy` deploys to `api-hwc.phake.app`
- Code is minified automatically
- Migrations run separately via `wrangler d1 migrations apply`

## Common Tasks

### Adding a New Route
1. Create route handler in `src/routes/`
2. Use `new Hono<App>()` for proper typing
3. Apply auth middleware if needed
4. Register in `src/index.ts` via `app.route("/v1/path", routeHandler)`

### Adding a Database Table
1. Define schema in `src/db/d1/schema.ts`
2. Add relations if needed
3. Run `bun run db:generate` to create migration
4. Create repository class in `src/db/d1/repositories/`
5. Run `bun run db:migrate` to apply

### Invalidating Cache
Use `CacheService` methods:
- `invalidateCar(carId)`: Single car cache
- `invalidateAllCars()`: All car-related caches
- `delByPrefix(prefix)`: Bulk invalidation by prefix
- Call these after data mutations (create/update/delete)

### Working with Secrets Locally
1. Create `.dev.vars` file (gitignored) with key=value pairs
2. Or use Wrangler secrets: `bun run local:secrets:create --name KEY --value val`
3. Access in code via `env.BINDING_NAME.get()` for secrets store bindings
