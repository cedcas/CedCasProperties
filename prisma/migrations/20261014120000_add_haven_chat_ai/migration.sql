-- Haven AI (H0+H1) — two new, additive tables. No existing table is touched.
-- HavenChatUsage: one row per guest message, for the HAVEN_AI_MONTHLY_CAP_USD spend cap
-- and the durable rate limits (a row count IS the message count — see rate-limit.ts).
-- HavenChatTranscript: one row per chat message, masked before it is ever written here
-- (src/lib/haven/masking.ts), 90-day retention via /api/cron/haven-retention.
-- Expand-only: old code (which doesn't know either table exists) keeps working unmodified.

-- CreateTable
CREATE TABLE `HavenChatUsage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sessionId` VARCHAR(191) NOT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `inputTokens` INTEGER NOT NULL,
    `outputTokens` INTEGER NOT NULL,
    `costUsd` DECIMAL(10, 6) NOT NULL,
    `toolCalls` INTEGER NOT NULL DEFAULT 0,
    `outcome` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,

    INDEX `HavenChatUsage_createdAt_idx`(`createdAt`),
    INDEX `HavenChatUsage_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HavenChatTranscript` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lang` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `toolNames` TEXT NULL,

    INDEX `HavenChatTranscript_sessionId_idx`(`sessionId`),
    INDEX `HavenChatTranscript_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
