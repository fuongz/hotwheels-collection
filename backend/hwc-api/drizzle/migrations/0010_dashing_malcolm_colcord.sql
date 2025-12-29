ALTER TABLE `cars` RENAME TO `cars_versions`;--> statement-breakpoint
CREATE TABLE `designers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`wiki_slug` text,
	`tenure_from` integer,
	`tenure_to` integer,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designers_name_unique` ON `designers` (`name`);--> statement-breakpoint
DROP INDEX `cars_toy_code_unique`;--> statement-breakpoint
DROP INDEX `cars_year_idx`;--> statement-breakpoint
DROP INDEX `cars_model_idx`;--> statement-breakpoint
DROP INDEX `cars_updated_at_idx`;--> statement-breakpoint
DROP INDEX `cars_toy_code_idx`;--> statement-breakpoint
DROP INDEX `cars_created_at_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `cars_versions_toy_code_unique` ON `cars_versions` (`toy_code`);--> statement-breakpoint
CREATE INDEX `car_versions_year_idx` ON `cars_versions` (`year`);--> statement-breakpoint
CREATE INDEX `car_versions_model_idx` ON `cars_versions` (`model`);--> statement-breakpoint
CREATE INDEX `car_versions_updated_at_idx` ON `cars_versions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `car_versions_toy_code_idx` ON `cars_versions` (`toy_code`);--> statement-breakpoint
CREATE INDEX `car_versions_created_at_idx` ON `cars_versions` (`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_car_series` (
	`id` text PRIMARY KEY NOT NULL,
	`car_version_id` text NOT NULL,
	`series_id` text NOT NULL,
	`index` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`car_version_id`) REFERENCES `cars_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_car_series`("id", "car_version_id", "series_id", "index", "created_at", "updated_at") SELECT "id", "car_id" as "car_version_id", "series_id", "index", "created_at", "updated_at" FROM `car_series`;--> statement-breakpoint
DROP TABLE `car_series`;--> statement-breakpoint
ALTER TABLE `__new_car_series` RENAME TO `car_series`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `car_series_car_version_id_idx` ON `car_series` (`car_version_id`);--> statement-breakpoint
CREATE INDEX `car_series_series_id_idx` ON `car_series` (`series_id`);--> statement-breakpoint
CREATE INDEX `car_series_car_series_idx` ON `car_series` (`car_version_id`,`series_id`);--> statement-breakpoint
CREATE TABLE `__new_user_cars` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`car_version_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`car_version_id`) REFERENCES `cars_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_cars`("id", "user_id", "car_version_id", "quantity", "notes", "created_at", "updated_at") SELECT "id", "user_id", "car_id" as "car_version_id", "quantity", "notes", "created_at", "updated_at" FROM `user_cars`;--> statement-breakpoint
DROP TABLE `user_cars`;--> statement-breakpoint
ALTER TABLE `__new_user_cars` RENAME TO `user_cars`;--> statement-breakpoint
CREATE INDEX `user_cars_user_id_idx` ON `user_cars` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_cars_car_version_id_idx` ON `user_cars` (`car_version_id`);--> statement-breakpoint
CREATE INDEX `user_cars_user_car_version_idx` ON `user_cars` (`user_id`,`car_version_id`);
