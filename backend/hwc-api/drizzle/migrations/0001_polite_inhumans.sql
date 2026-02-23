ALTER TABLE `releases` ADD `release_code` text;--> statement-breakpoint
CREATE INDEX `releases_release_code_idx` ON `releases` (`release_code`);