CREATE TABLE `card_images` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`side` text NOT NULL,
	`data_url` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_images_card_idx` ON `card_images` (`card_id`);--> statement-breakpoint
CREATE TABLE `card_tags` (
	`card_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`card_id`, `tag_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`phones` text NOT NULL,
	`emails` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`event_id` text,
	`note` text DEFAULT '' NOT NULL,
	`follow_up_at` text,
	`raw_text` text DEFAULT '' NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`thumb` text,
	`extraction_method` text DEFAULT 'manual' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cards_event_idx` ON `cards` (`event_id`);--> statement-breakpoint
CREATE INDEX `cards_created_idx` ON `cards` (`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`date` text,
	`location` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_name_unique` ON `events` (`name`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);