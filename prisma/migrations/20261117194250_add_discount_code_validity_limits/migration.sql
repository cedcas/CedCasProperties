-- AlterTable
ALTER TABLE `DiscountCode` ADD COLUMN `validFrom` DATE NULL,
    ADD COLUMN `validUntil` DATE NULL,
    ADD COLUMN `allowedWeekdays` TEXT NULL;
