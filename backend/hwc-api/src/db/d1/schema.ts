import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const cars = sqliteTable("cars", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => `car_${nanoid()}`),
	toyCode: text("toy_code").notNull().unique(),
	toyIndex: text("toy_index").notNull(),
	model: text("model").notNull(),
	avatarUrl: text("avatar_url"),
	year: text("year").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const carSeries = sqliteTable("car_series", {
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
});

export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type Car = typeof cars.$inferSelect;
export type NewCar = typeof cars.$inferInsert;
export type CarSeries = typeof carSeries.$inferSelect;
export type NewCarSeries = typeof carSeries.$inferInsert;
