CREATE TABLE `user_cars` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`car_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_cars_user_id_idx` ON `user_cars` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_cars_car_id_idx` ON `user_cars` (`car_id`);--> statement-breakpoint
CREATE INDEX `user_cars_user_car_idx` ON `user_cars` (`user_id`,`car_id`);