CREATE TABLE `approvalRequests` (
	`id` varchar(36) NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`eventId` varchar(36) NOT NULL,
	`description` text NOT NULL,
	`riskLevel` enum('low','medium','high') NOT NULL,
	`toolName` varchar(128) NOT NULL,
	`toolInput` json NOT NULL,
	`approvalStatus` enum('pending','approved','rejected','edited') NOT NULL DEFAULT 'pending',
	`resolvedInput` json,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approvalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliverables` (
	`id` varchar(36) NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`eventId` varchar(36),
	`filename` varchar(255) NOT NULL,
	`fileType` varchar(100) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` text NOT NULL,
	`thumbnailUrl` text,
	`isFinal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliverables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(64) NOT NULL,
	`label` varchar(120) NOT NULL,
	`encryptedAccessToken` text NOT NULL,
	`encryptedRefreshToken` text,
	`scopes` json NOT NULL,
	`availableToAllTasks` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_user_provider_label_unique` UNIQUE(`userId`,`provider`,`label`)
);
--> statement-breakpoint
CREATE TABLE `memoryFacts` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`factText` text NOT NULL,
	`memoryCategory` enum('preference','skill','project','tool_credential_hint','factual') NOT NULL,
	`sourceTaskId` varchar(36),
	`confidence` double NOT NULL,
	`memoryStatus` enum('pending','active','archived','user_deleted') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `memoryFacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sandboxes` (
	`id` varchar(36) NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`sandboxProvider` enum('docker','e2b') NOT NULL,
	`region` varchar(32) NOT NULL,
	`sandboxStatus` enum('booting','active','checkpointed','destroyed') NOT NULL,
	`providerSandboxId` varchar(255),
	`checkpointRef` text,
	`maxSessionSeconds` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`destroyedAt` timestamp,
	CONSTRAINT `sandboxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskEvents` (
	`id` varchar(36) NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`sequenceNumber` bigint NOT NULL,
	`eventType` enum('user_message','agent_message','clarifying_question','plan_update','tool_call','tool_result','approval_request','approval_response','screenshot','error','status_change','context_summary','user_file_edit','user_terminal_command') NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_events_sequence_unique` UNIQUE(`taskId`,`sequenceNumber`)
);
--> statement-breakpoint
CREATE TABLE `taskMessages` (
	`id` varchar(36) NOT NULL,
	`taskId` varchar(36) NOT NULL,
	`messageRole` enum('user','agent') NOT NULL,
	`content` text NOT NULL,
	`eventId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`goal` text NOT NULL,
	`taskStatus` enum('queued','booting','planning','running','needs_input','paused','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`currentStepSummary` text,
	`plan` json NOT NULL,
	`autonomySettings` json NOT NULL,
	`sandboxId` varchar(36),
	`involvesCode` boolean NOT NULL DEFAULT false,
	`isPinned` boolean NOT NULL DEFAULT false,
	`estimateBand` enum('quick','standard','extensive'),
	`estimatedCreditsMin` int,
	`estimatedCreditsMax` int,
	`creditsConsumed` double NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`failedReason` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usageEvents` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(36),
	`creditsDelta` double NOT NULL,
	`reason` varchar(160) NOT NULL,
	`metadata` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usageEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `creditsBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `preferences` json;--> statement-breakpoint
ALTER TABLE `users` ADD `hasCompletedOnboarding` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `approvalRequests` ADD CONSTRAINT `approvalRequests_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `approvalRequests` ADD CONSTRAINT `approvalRequests_eventId_taskEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `taskEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliverables` ADD CONSTRAINT `deliverables_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliverables` ADD CONSTRAINT `deliverables_eventId_taskEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `taskEvents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrations` ADD CONSTRAINT `integrations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memoryFacts` ADD CONSTRAINT `memoryFacts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memoryFacts` ADD CONSTRAINT `memoryFacts_sourceTaskId_tasks_id_fk` FOREIGN KEY (`sourceTaskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sandboxes` ADD CONSTRAINT `sandboxes_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskEvents` ADD CONSTRAINT `taskEvents_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskMessages` ADD CONSTRAINT `taskMessages_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskMessages` ADD CONSTRAINT `taskMessages_eventId_taskEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `taskEvents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usageEvents` ADD CONSTRAINT `usageEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usageEvents` ADD CONSTRAINT `usageEvents_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `approval_requests_task_status_idx` ON `approvalRequests` (`taskId`,`approvalStatus`);--> statement-breakpoint
CREATE INDEX `deliverables_task_final_created_idx` ON `deliverables` (`taskId`,`isFinal`,`createdAt`);--> statement-breakpoint
CREATE INDEX `memory_facts_user_status_idx` ON `memoryFacts` (`userId`,`memoryStatus`);--> statement-breakpoint
CREATE INDEX `sandboxes_task_status_idx` ON `sandboxes` (`taskId`,`sandboxStatus`);--> statement-breakpoint
CREATE INDEX `task_events_task_created_idx` ON `taskEvents` (`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `task_messages_task_created_idx` ON `taskMessages` (`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tasks_user_status_created_idx` ON `tasks` (`userId`,`taskStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tasks_user_pinned_created_idx` ON `tasks` (`userId`,`isPinned`,`createdAt`);--> statement-breakpoint
CREATE INDEX `usage_events_user_task_created_idx` ON `usageEvents` (`userId`,`taskId`,`createdAt`);