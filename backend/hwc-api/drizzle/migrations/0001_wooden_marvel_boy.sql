PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cars` (
	`id` text PRIMARY KEY NOT NULL,
	`toy_code` text NOT NULL,
	`toy_index` text NOT NULL,
	`model` text NOT NULL,
	`avatar_url` text,
	`year` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_cars`("id", "toy_code", "toy_index", "model", "avatar_url", "year", "created_at", "updated_at") SELECT "id", "toy_code", "toy_index", "model", "avatar_url", "year", "created_at", "updated_at" FROM `cars`;--> statement-breakpoint
DROP TABLE `cars`;--> statement-breakpoint
ALTER TABLE `__new_cars` RENAME TO `cars`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `cars_toy_code_unique` ON `cars` (`toy_code`);