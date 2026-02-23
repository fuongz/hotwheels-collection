import { relations } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "../../lib/nanoid";

// ─────────────────────────────────────────────
// Reference / lookup tables
// ─────────────────────────────────────────────

export const collectionCategories = sqliteTable("collection_categories", {
	code: text("code").primaryKey(), // mainline, early_collection, exclusive, ...
	name: text("name").notNull(),
	description: text("description"),
});

export const collectionTypes = sqliteTable("collection_types", {
	code: text("code").primaryKey(), // basic, premium, monster_truck, track_set, ...
	name: text("name").notNull(),
	description: text("description"),
});

// ─────────────────────────────────────────────
// collections
// ─────────────────────────────────────────────

export const collections = sqliteTable(
	"collections",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),

		code: text("code").notNull().unique(), // mainline_2026, car_culture, ...
		name: text("name").notNull(),
		displayName: text("display_name"),
		description: text("description"),

		// Classification
		categoryCode: text("category_code")
			.notNull()
			.references(() => collectionCategories.code),
		typeCode: text("type_code").references(() => collectionTypes.code),

		scale: text("scale"), // '1:64', '1:50', 'mixed'

		// Time context
		startYear: integer("start_year"),
		endYear: integer("end_year"),
		isAnnual: integer("is_annual", { mode: "boolean" })
			.notNull()
			.default(false),

		// Hierarchy / flags
		parentId: integer("parent_id").references(
			(): AnySQLiteColumn => collections.id,
		),
		isMainline: integer("is_mainline", { mode: "boolean" })
			.notNull()
			.default(false),
		isExclusive: integer("is_exclusive", { mode: "boolean" })
			.notNull()
			.default(false),

		wikiSlug: text("wiki_slug"),
		wikiUrl: text("wiki_url"),
		officialLine: text("official_line"),
		approxItemCount: integer("approx_item_count"),
		notes: text("notes"),

		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		index("collections_category_code_idx").on(table.categoryCode),
		index("collections_type_code_idx").on(table.typeCode),
		index("collections_parent_id_idx").on(table.parentId),
		index("collections_is_mainline_idx").on(table.isMainline),
		index("collections_is_exclusive_idx").on(table.isExclusive),
		index("collections_start_year_idx").on(table.startYear),
		index("collections_end_year_idx").on(table.endYear),
		index("collections_start_end_year_idx").on(table.startYear, table.endYear),
	],
);

// ─────────────────────────────────────────────
// designers
// ─────────────────────────────────────────────

export const designers = sqliteTable(
	"designers",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `d_${nanoid()}`),

		name: text("name").notNull().unique(),
		nickname: text("nickname"),
		country: text("country"),

		wikiSlug: text("wiki_slug").unique(),
		wikiUrl: text("wiki_url"),
		notes: text("notes"),

		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		index("designers_name_idx").on(table.name),
		index("designers_country_idx").on(table.country),
		index("designers_wiki_slug_idx").on(table.wikiSlug),
	],
);

// ─────────────────────────────────────────────
// castings
// ─────────────────────────────────────────────

export const castings = sqliteTable(
	"castings",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `casting_${nanoid()}`),

		code: text("code").notNull().unique(), // '67_camaro', 'bone_shaker'
		name: text("name").notNull(),
		seriesName: text("series_name"),
		manufacturer: text("manufacturer").default("Mattel"),
		firstYear: integer("first_year"),
		bodyType: text("body_type"), // 'licensed', 'fantasy', 'character'
		scale: text("scale"), // '1:64', '1:50', ...
		baseText: text("base_text"),
		designerDisplay: text("designer_display"), // raw, non-normalized designer string
		avatarUrl: text("avatar_url"),
		wikiSlug: text("wiki_slug").unique(),
		wikiUrl: text("wiki_url"),
		notes: text("notes"),

		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		index("castings_code_idx").on(table.code),
		index("castings_name_idx").on(table.name),
		index("castings_body_type_idx").on(table.bodyType),
		index("castings_first_year_idx").on(table.firstYear),
		index("castings_manufacturer_idx").on(table.manufacturer),
	],
);

// ─────────────────────────────────────────────
// castingDesigners  (castings ↔ designers, many-to-many)
// ─────────────────────────────────────────────

export const castingDesigners = sqliteTable(
	"casting_designers",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `cd_${nanoid()}`),

		castingId: text("casting_id")
			.notNull()
			.references(() => castings.id, { onDelete: "cascade" }),
		designerId: text("designer_id")
			.notNull()
			.references(() => designers.id, { onDelete: "cascade" }),

		role: text("role"), // 'lead', 'co_designer', 'retool'
		yearFrom: integer("year_from"),
		yearTo: integer("year_to"),
		notes: text("notes"),
	},
	(table) => [
		index("casting_designers_casting_id_idx").on(table.castingId),
		index("casting_designers_designer_id_idx").on(table.designerId),
		index("casting_designers_casting_designer_idx").on(
			table.castingId,
			table.designerId,
		),
	],
);

// ─────────────────────────────────────────────
// releases
// ─────────────────────────────────────────────

export const releases = sqliteTable(
	"releases",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `rel_${nanoid()}`),

		castingId: text("casting_id")
			.notNull()
			.references(() => castings.id, { onDelete: "cascade" }),
		collectionId: integer("collection_id")
			.notNull()
			.references(() => collections.id),

		year: integer("year"),
		releaseName: text("release_name"),
		color: text("color"),
		tampo: text("tampo"),
		wheelType: text("wheel_type"), // 'RR', 'OH5', 'MC5'
		wheelCode: text("wheel_code"),
		baseColor: text("base_color"),
		baseType: text("base_type"),
		interiorColor: text("interior_color"),
		windowColor: text("window_color"),

		mainlineNumber: text("mainline_number"), // '143/250', 'TH'
		subSeriesNumber: text("sub_series_number"), // '2/10'
		caseCode: text("case_code"), // 'A', 'B', 'C'
		releaseCode: text("release_code"), // HYW18, HYW19
		toyIndex: integer("toy_index"),
		country: text("country"),

		avatarUrl: text("avatar_url"),
		isTreasureHunt: integer("is_treasure_hunt", { mode: "boolean" })
			.notNull()
			.default(false),
		isSuperTreasureHunt: integer("is_super_treasure_hunt", { mode: "boolean" })
			.notNull()
			.default(false),

		wikiSlug: text("wiki_slug"),
		wikiUrl: text("wiki_url"),
		notes: text("notes"),

		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		index("releases_casting_id_idx").on(table.castingId),
		index("releases_collection_id_idx").on(table.collectionId),
		index("releases_year_idx").on(table.year),
		index("releases_color_idx").on(table.color),
		index("releases_wheel_type_idx").on(table.wheelType),
		index("releases_is_treasure_hunt_idx").on(table.isTreasureHunt),
		index("releases_is_super_treasure_hunt_idx").on(table.isSuperTreasureHunt),
		// Composite indexes for common join/filter patterns
		index("releases_casting_collection_idx").on(
			table.castingId,
			table.collectionId,
		),
		index("releases_casting_year_idx").on(table.castingId, table.year),
		index("releases_collection_year_idx").on(table.collectionId, table.year),
		index("releases_release_code_idx").on(table.releaseCode),
	],
);

// ─────────────────────────────────────────────
// exclusivePrograms
// ─────────────────────────────────────────────

export const exclusivePrograms = sqliteTable(
	"exclusive_programs",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `ep_${nanoid()}`),

		code: text("code").notNull().unique(), // 'rlc', 'sdcc', 'target_red'
		name: text("name").notNull(),
		description: text("description"),
		kind: text("kind"), // 'club', 'store', 'event', 'online'
		retailer: text("retailer"), // 'Target', 'Walmart', ...
		country: text("country"),

		wikiSlug: text("wiki_slug"),
		wikiUrl: text("wiki_url"),
		notes: text("notes"),
	},
	(table) => [
		index("exclusive_programs_kind_idx").on(table.kind),
		index("exclusive_programs_retailer_idx").on(table.retailer),
		index("exclusive_programs_country_idx").on(table.country),
	],
);

// ─────────────────────────────────────────────
// releaseExclusives  (releases ↔ exclusivePrograms, many-to-many)
// ─────────────────────────────────────────────

export const releaseExclusives = sqliteTable(
	"release_exclusives",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `re_${nanoid()}`),

		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		exclusiveProgramId: text("exclusive_program_id")
			.notNull()
			.references(() => exclusivePrograms.id, { onDelete: "cascade" }),

		exclusiveType: text("exclusive_type"), // 'membership_car', 'selections', 'store_only', 'event_only'
		notes: text("notes"),
	},
	(table) => [
		index("release_exclusives_release_id_idx").on(table.releaseId),
		index("release_exclusives_exclusive_program_id_idx").on(
			table.exclusiveProgramId,
		),
		index("release_exclusives_release_exclusive_idx").on(
			table.releaseId,
			table.exclusiveProgramId,
		),
	],
);

// ─────────────────────────────────────────────
// userCars
// ─────────────────────────────────────────────

export const userCars = sqliteTable(
	"user_cars",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `user_car_${nanoid()}`),

		userId: text("user_id").notNull(),
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),

		quantity: integer("quantity").notNull().default(1),
		notes: text("notes"),

		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => [
		index("user_cars_user_id_idx").on(table.userId),
		index("user_cars_release_id_idx").on(table.releaseId),
		index("user_cars_user_release_idx").on(table.userId, table.releaseId),
	],
);

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const collectionCategoriesRelations = relations(
	collectionCategories,
	({ many }) => ({
		collections: many(collections),
	}),
);

export const collectionTypesRelations = relations(
	collectionTypes,
	({ many }) => ({
		collections: many(collections),
	}),
);

export const collectionsRelations = relations(collections, ({ one, many }) => ({
	category: one(collectionCategories, {
		fields: [collections.categoryCode],
		references: [collectionCategories.code],
	}),
	type: one(collectionTypes, {
		fields: [collections.typeCode],
		references: [collectionTypes.code],
	}),
	parent: one(collections, {
		fields: [collections.parentId],
		references: [collections.id],
		relationName: "collection_hierarchy",
	}),
	children: many(collections, { relationName: "collection_hierarchy" }),
	releases: many(releases),
}));

export const designersRelations = relations(designers, ({ many }) => ({
	castingDesigners: many(castingDesigners),
}));

export const castingsRelations = relations(castings, ({ many }) => ({
	releases: many(releases),
	castingDesigners: many(castingDesigners),
}));

export const castingDesignersRelations = relations(
	castingDesigners,
	({ one }) => ({
		casting: one(castings, {
			fields: [castingDesigners.castingId],
			references: [castings.id],
		}),
		designer: one(designers, {
			fields: [castingDesigners.designerId],
			references: [designers.id],
		}),
	}),
);

export const releasesRelations = relations(releases, ({ one, many }) => ({
	casting: one(castings, {
		fields: [releases.castingId],
		references: [castings.id],
	}),
	collection: one(collections, {
		fields: [releases.collectionId],
		references: [collections.id],
	}),
	releaseExclusives: many(releaseExclusives),
	userCars: many(userCars),
}));

export const exclusiveProgramsRelations = relations(
	exclusivePrograms,
	({ many }) => ({
		releaseExclusives: many(releaseExclusives),
	}),
);

export const releaseExclusivesRelations = relations(
	releaseExclusives,
	({ one }) => ({
		release: one(releases, {
			fields: [releaseExclusives.releaseId],
			references: [releases.id],
		}),
		exclusiveProgram: one(exclusivePrograms, {
			fields: [releaseExclusives.exclusiveProgramId],
			references: [exclusivePrograms.id],
		}),
	}),
);

export const userCarsRelations = relations(userCars, ({ one }) => ({
	release: one(releases, {
		fields: [userCars.releaseId],
		references: [releases.id],
	}),
}));

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CollectionCategory = typeof collectionCategories.$inferSelect;
export type NewCollectionCategory = typeof collectionCategories.$inferInsert;

export type CollectionType = typeof collectionTypes.$inferSelect;
export type NewCollectionType = typeof collectionTypes.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type Designer = typeof designers.$inferSelect;
export type NewDesigner = typeof designers.$inferInsert;

export type Casting = typeof castings.$inferSelect;
export type NewCasting = typeof castings.$inferInsert;

export type CastingDesigner = typeof castingDesigners.$inferSelect;
export type NewCastingDesigner = typeof castingDesigners.$inferInsert;

export type Release = typeof releases.$inferSelect;
export type NewRelease = typeof releases.$inferInsert;

export type ExclusiveProgram = typeof exclusivePrograms.$inferSelect;
export type NewExclusiveProgram = typeof exclusivePrograms.$inferInsert;

export type ReleaseExclusive = typeof releaseExclusives.$inferSelect;
export type NewReleaseExclusive = typeof releaseExclusives.$inferInsert;

export type UserCar = typeof userCars.$inferSelect;
export type NewUserCar = typeof userCars.$inferInsert;
