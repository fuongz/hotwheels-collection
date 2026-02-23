CREATE TABLE `casting_designers` (
	`id` text PRIMARY KEY NOT NULL,
	`casting_id` text NOT NULL,
	`designer_id` text NOT NULL,
	`role` text,
	`year_from` integer,
	`year_to` integer,
	`notes` text,
	FOREIGN KEY (`casting_id`) REFERENCES `castings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`designer_id`) REFERENCES `designers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `casting_designers_casting_id_idx` ON `casting_designers` (`casting_id`);--> statement-breakpoint
CREATE INDEX `casting_designers_designer_id_idx` ON `casting_designers` (`designer_id`);--> statement-breakpoint
CREATE INDEX `casting_designers_casting_designer_idx` ON `casting_designers` (`casting_id`,`designer_id`);--> statement-breakpoint
CREATE TABLE `castings` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`series_name` text,
	`manufacturer` text DEFAULT 'Mattel',
	`first_year` integer,
	`body_type` text,
	`scale` text,
	`base_text` text,
	`designer_display` text,
	`avatar_url` text,
	`wiki_slug` text,
	`wiki_url` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `castings_code_unique` ON `castings` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `castings_wiki_slug_unique` ON `castings` (`wiki_slug`);--> statement-breakpoint
CREATE INDEX `castings_code_idx` ON `castings` (`code`);--> statement-breakpoint
CREATE INDEX `castings_name_idx` ON `castings` (`name`);--> statement-breakpoint
CREATE INDEX `castings_body_type_idx` ON `castings` (`body_type`);--> statement-breakpoint
CREATE INDEX `castings_first_year_idx` ON `castings` (`first_year`);--> statement-breakpoint
CREATE INDEX `castings_manufacturer_idx` ON `castings` (`manufacturer`);--> statement-breakpoint
CREATE TABLE `collection_categories` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `collection_types` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`display_name` text,
	`description` text,
	`category_code` text NOT NULL,
	`type_code` text,
	`scale` text,
	`start_year` integer,
	`end_year` integer,
	`is_annual` integer DEFAULT false NOT NULL,
	`parent_id` integer,
	`is_mainline` integer DEFAULT false NOT NULL,
	`is_exclusive` integer DEFAULT false NOT NULL,
	`wiki_slug` text,
	`wiki_url` text,
	`official_line` text,
	`approx_item_count` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_code`) REFERENCES `collection_categories`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`type_code`) REFERENCES `collection_types`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_code_unique` ON `collections` (`code`);--> statement-breakpoint
CREATE INDEX `collections_category_code_idx` ON `collections` (`category_code`);--> statement-breakpoint
CREATE INDEX `collections_type_code_idx` ON `collections` (`type_code`);--> statement-breakpoint
CREATE INDEX `collections_parent_id_idx` ON `collections` (`parent_id`);--> statement-breakpoint
CREATE INDEX `collections_is_mainline_idx` ON `collections` (`is_mainline`);--> statement-breakpoint
CREATE INDEX `collections_is_exclusive_idx` ON `collections` (`is_exclusive`);--> statement-breakpoint
CREATE INDEX `collections_start_year_idx` ON `collections` (`start_year`);--> statement-breakpoint
CREATE INDEX `collections_end_year_idx` ON `collections` (`end_year`);--> statement-breakpoint
CREATE INDEX `collections_start_end_year_idx` ON `collections` (`start_year`,`end_year`);--> statement-breakpoint
CREATE TABLE `designers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`country` text,
	`wiki_slug` text,
	`wiki_url` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designers_name_unique` ON `designers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `designers_wiki_slug_unique` ON `designers` (`wiki_slug`);--> statement-breakpoint
CREATE INDEX `designers_name_idx` ON `designers` (`name`);--> statement-breakpoint
CREATE INDEX `designers_country_idx` ON `designers` (`country`);--> statement-breakpoint
CREATE INDEX `designers_wiki_slug_idx` ON `designers` (`wiki_slug`);--> statement-breakpoint
CREATE TABLE `exclusive_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`kind` text,
	`retailer` text,
	`country` text,
	`wiki_slug` text,
	`wiki_url` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exclusive_programs_code_unique` ON `exclusive_programs` (`code`);--> statement-breakpoint
CREATE INDEX `exclusive_programs_kind_idx` ON `exclusive_programs` (`kind`);--> statement-breakpoint
CREATE INDEX `exclusive_programs_retailer_idx` ON `exclusive_programs` (`retailer`);--> statement-breakpoint
CREATE INDEX `exclusive_programs_country_idx` ON `exclusive_programs` (`country`);--> statement-breakpoint
CREATE TABLE `release_exclusives` (
	`id` text PRIMARY KEY NOT NULL,
	`release_id` text NOT NULL,
	`exclusive_program_id` text NOT NULL,
	`exclusive_type` text,
	`notes` text,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exclusive_program_id`) REFERENCES `exclusive_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `release_exclusives_release_id_idx` ON `release_exclusives` (`release_id`);--> statement-breakpoint
CREATE INDEX `release_exclusives_exclusive_program_id_idx` ON `release_exclusives` (`exclusive_program_id`);--> statement-breakpoint
CREATE INDEX `release_exclusives_release_exclusive_idx` ON `release_exclusives` (`release_id`,`exclusive_program_id`);--> statement-breakpoint
CREATE TABLE `releases` (
	`id` text PRIMARY KEY NOT NULL,
	`casting_id` text NOT NULL,
	`collection_id` integer NOT NULL,
	`year` integer,
	`release_name` text,
	`color` text,
	`tampo` text,
	`wheel_type` text,
	`wheel_code` text,
	`base_color` text,
	`base_type` text,
	`interior_color` text,
	`window_color` text,
	`mainline_number` text,
	`sub_series_number` text,
	`case_code` text,
	`toy_index` integer,
	`country` text,
	`avatar_url` text,
	`is_treasure_hunt` integer DEFAULT false NOT NULL,
	`is_super_treasure_hunt` integer DEFAULT false NOT NULL,
	`wiki_slug` text,
	`wiki_url` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`casting_id`) REFERENCES `castings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `releases_casting_id_idx` ON `releases` (`casting_id`);--> statement-breakpoint
CREATE INDEX `releases_collection_id_idx` ON `releases` (`collection_id`);--> statement-breakpoint
CREATE INDEX `releases_year_idx` ON `releases` (`year`);--> statement-breakpoint
CREATE INDEX `releases_color_idx` ON `releases` (`color`);--> statement-breakpoint
CREATE INDEX `releases_wheel_type_idx` ON `releases` (`wheel_type`);--> statement-breakpoint
CREATE INDEX `releases_is_treasure_hunt_idx` ON `releases` (`is_treasure_hunt`);--> statement-breakpoint
CREATE INDEX `releases_is_super_treasure_hunt_idx` ON `releases` (`is_super_treasure_hunt`);--> statement-breakpoint
CREATE INDEX `releases_casting_collection_idx` ON `releases` (`casting_id`,`collection_id`);--> statement-breakpoint
CREATE INDEX `releases_casting_year_idx` ON `releases` (`casting_id`,`year`);--> statement-breakpoint
CREATE INDEX `releases_collection_year_idx` ON `releases` (`collection_id`,`year`);--> statement-breakpoint
CREATE TABLE `user_cars` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`release_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_cars_user_id_idx` ON `user_cars` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_cars_release_id_idx` ON `user_cars` (`release_id`);--> statement-breakpoint
CREATE INDEX `user_cars_user_release_idx` ON `user_cars` (`user_id`,`release_id`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);