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

export const cars = sqliteTable(
	"cars",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `car_${nanoid()}`),
		toyCode: text("toy_code").notNull().unique(),
		toyIndex: text("toy_index").notNull(),
		model: text("model").notNull(),
		wikiSlug: text("wiki_slug"),
		avatarUrl: text("avatar_url"),
		year: text("year").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(table) => ({
		yearIdx: index("cars_year_idx").on(table.year),
		modelIdx: index("cars_model_idx").on(table.model),
		updatedAtIdx: index("cars_updated_at_idx").on(table.updatedAt),
		toyCodeIdx: index("cars_toy_code_idx").on(table.toyCode),
		createdAtIdx: index("cars_created_at_idx").on(table.createdAt),
	}),
);

export const carSeries = sqliteTable(
	"car_series",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => `car_series_${nanoid()}`),
		carId: text("car_id")
			.notNull()
			.references(() => cars.id),
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
		carIdIdx: index("car_series_car_id_idx").on(table.carId),
		seriesIdIdx: index("car_series_series_id_idx").on(table.seriesId),
		carSeriesIdx: index("car_series_car_series_idx").on(
			table.carId,
			table.seriesId,
		),
	}),
);

// -- relations
export const seriesRelations = relations(series, ({ many }) => ({
	cars: many(cars),
}));

export const carSeriesRelations = relations(carSeries, ({ one }) => ({
	car: one(cars, {
		fields: [carSeries.carId],
		references: [cars.id],
	}),
	series: one(series, {
		fields: [carSeries.seriesId],
		references: [series.id],
	}),
}));

export const carRelations = relations(cars, ({ many }) => ({
	series: many(carSeries),
}));

export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;

export type Car = typeof cars.$inferSelect;
export type NewCar = typeof cars.$inferInsert;

export type CarSeries = typeof carSeries.$inferSelect;
export type NewCarSeries = typeof carSeries.$inferInsert;
