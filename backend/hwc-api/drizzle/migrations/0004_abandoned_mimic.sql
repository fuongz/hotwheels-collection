CREATE INDEX `car_series_car_id_idx` ON `car_series` (`car_id`);--> statement-breakpoint
CREATE INDEX `car_series_series_id_idx` ON `car_series` (`series_id`);--> statement-breakpoint
CREATE INDEX `car_series_car_series_idx` ON `car_series` (`car_id`,`series_id`);--> statement-breakpoint
CREATE INDEX `cars_year_idx` ON `cars` (`year`);--> statement-breakpoint
CREATE INDEX `cars_model_idx` ON `cars` (`model`);--> statement-breakpoint
CREATE INDEX `cars_updated_at_idx` ON `cars` (`updated_at`);