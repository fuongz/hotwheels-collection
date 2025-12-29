import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
	10,
);

export const series = sqliteTable("series", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => `series_${nanoid()}`),
	name: text("name").notNull().unique(),
	seriesNum: text("series_num"),
	wikiSlug: text("wiki_slug"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const designers = sqliteTable("designers", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => `designer_${nanoid()}`),
	name: text("name").notNull().unique(),
	wikiSlug: text("wiki_slug"),

	tenureFrom: integer("tenure_from"),
	tenureTo: integer("tenure_to"),

	description: text("description"),

	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const carVersions = sqliteTable(
	"cars_versions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `car_ver_${nanoid()}`),

		toyCode: text("toy_code").notNull().unique(),
		toyIndex: text("toy_index").notNull(),

		model: text("model").notNull(),
		wikiSlug: text("wiki_slug"),
		avatarUrl: text("avatar_url"),
		year: text("year").notNull(),

		// -- timestamps
		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => ({
		yearIdx: index("car_versions_year_idx").on(table.year),
		modelIdx: index("car_versions_model_idx").on(table.model),
		updatedAtIdx: index("car_versions_updated_at_idx").on(table.updatedAt),
		toyCodeIdx: index("car_versions_toy_code_idx").on(table.toyCode),
		createdAtIdx: index("car_versions_created_at_idx").on(table.createdAt),
	}),
);

export const carSeries = sqliteTable(
	"car_series",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `car_series_${nanoid()}`),
		carVersionId: text("car_version_id")
			.notNull()
			.references(() => carVersions.id),
		seriesId: text("series_id")
			.notNull()
			.references(() => series.id),
		index: integer("index").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => ({
		carVersionIdIdx: index("car_series_car_version_id_idx").on(
			table.carVersionId,
		),
		seriesIdIdx: index("car_series_series_id_idx").on(table.seriesId),
		carSeriesIdx: index("car_series_car_series_idx").on(
			table.carVersionId,
			table.seriesId,
		),
	}),
);

export const userCars = sqliteTable(
	"user_cars",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `user_car_${nanoid()}`),
		userId: text("user_id").notNull(),
		carVersionId: text("car_version_id")
			.notNull()
			.references(() => carVersions.id, { onDelete: "cascade" }),
		quantity: integer("quantity").notNull().default(1),
		notes: text("notes"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => ({
		userIdIdx: index("user_cars_user_id_idx").on(table.userId),
		carVersionIdIdx: index("user_cars_car_version_id_idx").on(
			table.carVersionId,
		),
		userCarIdx: index("user_cars_user_car_version_idx").on(
			table.userId,
			table.carVersionId,
		),
	}),
);

// -- relations
export const seriesRelations = relations(series, ({ many }) => ({
	carVersions: many(carVersions),
}));

export const carSeriesRelations = relations(carSeries, ({ one }) => ({
	carVersion: one(carVersions, {
		fields: [carSeries.carVersionId],
		references: [carVersions.id],
	}),
	series: one(series, {
		fields: [carSeries.seriesId],
		references: [series.id],
	}),
}));

export const carRelations = relations(carVersions, ({ many }) => ({
	series: many(carSeries),
	userCars: many(userCars),
}));

export const userCarsRelations = relations(userCars, ({ one }) => ({
	carVersion: one(carVersions, {
		fields: [userCars.carVersionId],
		references: [carVersions.id],
	}),
}));

export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;

export type CarVersion = typeof carVersions.$inferSelect;
export type NewCarVersion = typeof carVersions.$inferInsert;

export type CarSeries = typeof carSeries.$inferSelect;
export type NewCarSeries = typeof carSeries.$inferInsert;

export type UserCar = typeof userCars.$inferSelect;
export type NewUserCar = typeof userCars.$inferInsert;
