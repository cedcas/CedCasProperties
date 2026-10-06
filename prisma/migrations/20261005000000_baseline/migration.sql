-- BASELINE — the application schema as it existed on production on 2026-10-05.
--
-- Until this migration, the schema was maintained by `prisma db push` during every Vercel
-- build and no migration history existed. This file reproduces that schema exactly: applied
-- to an empty MariaDB database it yields a `mariadb-dump --no-data` byte-identical to the
-- production and dev databases (see DEC-026 and the migration runbook).
--
-- It was generated with `prisma migrate diff --from-empty --to-schema-datamodel`, then the
-- columns and indexes were put in production's physical order (columns added over time by
-- `db push` sit at the end of their table, not where schema.prisma declares them). One
-- foreign-key index (`GuestMessage_quickReplyId_fkey`) is declared explicitly for the same
-- reason; InnoDB would otherwise create it implicitly, after the other indexes.
--
-- NEVER run this file against a populated database. On the existing dev and production
-- databases it is recorded as already applied (`prisma migrate resolve --applied`), which
-- writes one row of metadata and executes none of the statements below.
-- NEVER edit this file: Prisma stores its checksum, and the release gate compares it.

-- CreateTable
CREATE TABLE `Property` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `pricePerNight` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `location` VARCHAR(191) NOT NULL,
    `bedrooms` INTEGER NOT NULL DEFAULT 1,
    `bathrooms` INTEGER NOT NULL DEFAULT 1,
    `maxGuests` INTEGER NOT NULL DEFAULT 2,
    `images` TEXT NOT NULL,
    `amenities` TEXT NOT NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `featuredImage` TEXT NULL,
    `airbnbIcsUrl` TEXT NULL,
    `propertyRules` TEXT NULL,
    `aggregateReviewCount` INTEGER NULL,
    `aggregateReviewRating` DOUBLE NULL,
    `amenityDetails` TEXT NULL,
    `bestForSegments` TEXT NULL,
    `heroSummary` TEXT NULL,
    `housePolicies` TEXT NULL,
    `imageAlts` TEXT NULL,
    `neighborhoodPlaces` TEXT NULL,
    `pricingNotes` TEXT NULL,
    `propertyFaqs` TEXT NULL,
    `seoDescription` TEXT NULL,
    `seoTitle` TEXT NULL,
    `tagline` TEXT NULL,
    `extraGuestFeePerNight` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `includedGuests` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `Property_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `guestName` VARCHAR(191) NOT NULL,
    `guestEmail` VARCHAR(191) NOT NULL,
    `guestPhone` VARCHAR(191) NOT NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `guests` INTEGER NOT NULL DEFAULT 1,
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `discountAmount` DECIMAL(10, 2) NULL,
    `discountCode` VARCHAR(191) NULL,
    `nightlyTotal` DECIMAL(10, 2) NULL,
    `stripeFee` DECIMAL(10, 2) NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `optedOutAt` DATETIME(3) NULL,
    `extraGuestFee` DECIMAL(10, 2) NULL,
    `chargesNotes` TEXT NULL,
    `adminNotes` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckoutAttempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `propertyId` INTEGER NOT NULL,
    `guestName` VARCHAR(191) NOT NULL,
    `guestEmail` VARCHAR(191) NOT NULL,
    `guestPhone` VARCHAR(191) NOT NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `guests` INTEGER NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `discountCode` VARCHAR(191) NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `bookingId` INTEGER NULL,
    `alertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CheckoutAttempt_token_key`(`token`),
    INDEX `CheckoutAttempt_bookingId_alertedAt_updatedAt_idx`(`bookingId`, `alertedAt`, `updatedAt`),
    INDEX `CheckoutAttempt_guestEmail_idx`(`guestEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdditionalCharge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paymentMethod` VARCHAR(191) NULL,
    `stripeFee` DECIMAL(10, 2) NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `notifiedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdditionalCharge_token_key`(`token`),
    INDEX `AdditionalCharge_bookingId_idx`(`bookingId`),
    INDEX `AdditionalCharge_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuickReply` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `propertyId` INTEGER NULL,
    `subject` VARCHAR(191) NOT NULL,
    `bodyTemplate` TEXT NOT NULL,
    `trigger` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `anchor` VARCHAR(191) NULL,
    `offsetHours` INTEGER NULL,
    `skipIfPastAnchor` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `propertyIds` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduledMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `quickReplyId` INTEGER NOT NULL,
    `sendAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `sentAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',

    INDEX `ScheduledMessage_status_sendAt_idx`(`status`, `sendAt`),
    INDEX `ScheduledMessage_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuestMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `quickReplyId` INTEGER NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'email',
    `direction` VARCHAR(191) NOT NULL DEFAULT 'outbound',
    `trigger` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `error` TEXT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sourceQuickReplyId` INTEGER NULL,
    `fromNumber` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `toNumber` VARCHAR(191) NULL,
    `messageId` VARCHAR(998) NULL,

    INDEX `GuestMessage_bookingId_sentAt_idx`(`bookingId`, `sentAt`),
    INDEX `GuestMessage_quickReplyId_fkey`(`quickReplyId`),
    INDEX `GuestMessage_sourceQuickReplyId_idx`(`sourceQuickReplyId`),
    INDEX `GuestMessage_messageId_idx`(`messageId`(768)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailPollState` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mailbox` VARCHAR(191) NOT NULL,
    `lastSeenUid` INTEGER NOT NULL DEFAULT 0,
    `lastPolledAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailPollState_mailbox_key`(`mailbox`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnmatchedInboundMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'sms',
    `fromNumber` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBookingId` INTEGER NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `rawPayload` TEXT NULL,

    INDEX `UnmatchedInboundMessage_resolvedAt_receivedAt_idx`(`resolvedAt`, `receivedAt`),
    INDEX `UnmatchedInboundMessage_fromNumber_idx`(`fromNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiscountCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `maxUses` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `propertyIds` TEXT NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `DiscountCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ambassador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `facebookUrl` TEXT NOT NULL,
    `otherSocials` TEXT NULL,
    `audienceSize` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `occupation` VARCHAR(191) NOT NULL,
    `motivation` TEXT NOT NULL,
    `promotionPlan` TEXT NOT NULL,
    `gcashNumber` VARCHAR(191) NOT NULL,
    `agreedToTermsAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `promoCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ambassador_email_key`(`email`),
    UNIQUE INDEX `Ambassador_promoCode_key`(`promoCode`),
    INDEX `Ambassador_status_idx`(`status`),
    INDEX `Ambassador_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyRate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `rateType` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NULL,
    `specificDate` DATETIME(3) NULL,
    `rate` DECIMAL(10, 2) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryGroupMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryGroupId` INTEGER NOT NULL,
    `propertyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InventoryGroupMember_propertyId_key`(`propertyId`),
    UNIQUE INDEX `InventoryGroupMember_inventoryGroupId_propertyId_key`(`inventoryGroupId`, `propertyId`),
    INDEX `InventoryGroupMember_inventoryGroupId_idx`(`inventoryGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AvailabilityBlock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `internalNotes` TEXT NULL,
    `scope` VARCHAR(191) NOT NULL DEFAULT 'listing_only',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `isSystemGenerated` BOOLEAN NOT NULL DEFAULT false,
    `affectsAvailability` BOOLEAN NOT NULL DEFAULT true,
    `exportToIcal` BOOLEAN NOT NULL DEFAULT true,
    `sourceBookingId` INTEGER NULL,
    `sourceExternalEventId` INTEGER NULL,
    `parentBlockId` INTEGER NULL,
    `sourcePropertyId` INTEGER NULL,
    `inventoryGroupId` INTEGER NULL,
    `externalUid` VARCHAR(191) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `cancelledAt` DATETIME(3) NULL,

    UNIQUE INDEX `AvailabilityBlock_externalUid_key`(`externalUid`),
    INDEX `AvailabilityBlock_propertyId_status_startDate_endDate_idx`(`propertyId`, `status`, `startDate`, `endDate`),
    INDEX `AvailabilityBlock_sourceBookingId_idx`(`sourceBookingId`),
    INDEX `AvailabilityBlock_sourceExternalEventId_idx`(`sourceExternalEventId`),
    INDEX `AvailabilityBlock_inventoryGroupId_idx`(`inventoryGroupId`),
    INDEX `AvailabilityBlock_parentBlockId_idx`(`parentBlockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalCalendarEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `externalUid` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `removedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExternalCalendarEvent_propertyId_externalUid_key`(`propertyId`, `externalUid`),
    INDEX `ExternalCalendarEvent_propertyId_status_startDate_endDate_idx`(`propertyId`, `status`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalCalendarSyncState` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `lastStatus` VARCHAR(191) NULL,
    `lastError` TEXT NULL,
    `eventCount` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExternalCalendarSyncState_propertyId_key`(`propertyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `message` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `propertyId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `messageId` VARCHAR(998) NULL,
    `promotedAt` DATETIME(3) NULL,
    `promotedToBookingId` INTEGER NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'contact-form',

    INDEX `ContactMessage_email_idx`(`email`),
    INDEX `ContactMessage_promotedToBookingId_idx`(`promotedToBookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role` VARCHAR(191) NOT NULL DEFAULT 'admin',

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminPermission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminUserId` INTEGER NOT NULL,
    `properties` BOOLEAN NOT NULL DEFAULT false,
    `bookings` BOOLEAN NOT NULL DEFAULT false,
    `messages` BOOLEAN NOT NULL DEFAULT false,
    `testimonials` BOOLEAN NOT NULL DEFAULT false,
    `promoCodes` BOOLEAN NOT NULL DEFAULT false,
    `logs` BOOLEAN NOT NULL DEFAULT false,
    `userManagement` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminPermission_adminUserId_key`(`adminUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerEmail` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerNote_customerEmail_key`(`customerEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor` VARCHAR(191) NOT NULL,
    `actorRole` VARCHAR(191) NOT NULL,
    `actorId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdditionalCharge` ADD CONSTRAINT `AdditionalCharge_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuickReply` ADD CONSTRAINT `QuickReply_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledMessage` ADD CONSTRAINT `ScheduledMessage_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledMessage` ADD CONSTRAINT `ScheduledMessage_quickReplyId_fkey` FOREIGN KEY (`quickReplyId`) REFERENCES `QuickReply`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestMessage` ADD CONSTRAINT `GuestMessage_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestMessage` ADD CONSTRAINT `GuestMessage_quickReplyId_fkey` FOREIGN KEY (`quickReplyId`) REFERENCES `QuickReply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestMessage` ADD CONSTRAINT `GuestMessage_sourceQuickReplyId_fkey` FOREIGN KEY (`sourceQuickReplyId`) REFERENCES `QuickReply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRate` ADD CONSTRAINT `PropertyRate_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryGroupMember` ADD CONSTRAINT `InventoryGroupMember_inventoryGroupId_fkey` FOREIGN KEY (`inventoryGroupId`) REFERENCES `InventoryGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryGroupMember` ADD CONSTRAINT `InventoryGroupMember_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityBlock` ADD CONSTRAINT `AvailabilityBlock_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityBlock` ADD CONSTRAINT `AvailabilityBlock_sourceBookingId_fkey` FOREIGN KEY (`sourceBookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityBlock` ADD CONSTRAINT `AvailabilityBlock_sourceExternalEventId_fkey` FOREIGN KEY (`sourceExternalEventId`) REFERENCES `ExternalCalendarEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityBlock` ADD CONSTRAINT `AvailabilityBlock_parentBlockId_fkey` FOREIGN KEY (`parentBlockId`) REFERENCES `AvailabilityBlock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityBlock` ADD CONSTRAINT `AvailabilityBlock_sourcePropertyId_fkey` FOREIGN KEY (`sourcePropertyId`) REFERENCES `Property`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilityBlock` ADD CONSTRAINT `AvailabilityBlock_inventoryGroupId_fkey` FOREIGN KEY (`inventoryGroupId`) REFERENCES `InventoryGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalCalendarEvent` ADD CONSTRAINT `ExternalCalendarEvent_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminPermission` ADD CONSTRAINT `AdminPermission_adminUserId_fkey` FOREIGN KEY (`adminUserId`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminLog` ADD CONSTRAINT `AdminLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

