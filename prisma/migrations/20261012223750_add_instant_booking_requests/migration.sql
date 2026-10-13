-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `decidedAt` DATETIME(3) NULL,
    ADD COLUMN `decidedById` INTEGER NULL,
    ADD COLUMN `decisionNote` TEXT NULL,
    ADD COLUMN `holdAlertedAt` DATETIME(3) NULL,
    ADD COLUMN `paymentLinkExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `paymentSubmittedAt` DATETIME(3) NULL,
    ADD COLUMN `paymentToken` VARCHAR(191) NULL,
    ADD COLUMN `requestExpiresAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Property` ADD COLUMN `instantBookingMode` VARCHAR(191) NOT NULL DEFAULT 'on';

-- CreateIndex
CREATE UNIQUE INDEX `Booking_stripePaymentIntentId_key` ON `Booking`(`stripePaymentIntentId`);

-- CreateIndex
CREATE UNIQUE INDEX `Booking_paymentToken_key` ON `Booking`(`paymentToken`);

-- CreateIndex
CREATE INDEX `Booking_status_idx` ON `Booking`(`status`);

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

