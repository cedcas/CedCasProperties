-- AlterTable
ALTER TABLE `Property` ADD COLUMN `advanceNoticeDays` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `sameDayCutoffMinutes` INTEGER NULL;
