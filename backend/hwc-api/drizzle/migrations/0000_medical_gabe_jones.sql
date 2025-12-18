CREATE TABLE `cars` (
	`id` text PRIMARY KEY NOT NULL,
	`toy_code` text NOT NULL,
	`toy_index` text NOT NULL,
	`model` text NOT NULL,
	`series_id` text NOT NULL,
	`series_num` text,
	`photo_url` text,
	`year` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cars_toy_code_unique` ON `cars` (`toy_code`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`series_num` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_name_unique` ON `series` (`name`);