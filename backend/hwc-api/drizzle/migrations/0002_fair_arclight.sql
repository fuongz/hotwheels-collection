CREATE TABLE `car_series` (
	`id` text PRIMARY KEY NOT NULL,
	`car_id` text NOT NULL,
	`series_id` text NOT NULL,
	`index` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action
);
