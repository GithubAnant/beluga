-- CreateTable
CREATE TABLE `airports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,

    UNIQUE INDEX `airports_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aircraft` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `callsign` VARCHAR(20) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `airline` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `aircraft_callsign_key`(`callsign`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `runways` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `airport_id` INTEGER NOT NULL,
    `name` VARCHAR(20) NOT NULL,
    `length_m` INTEGER NOT NULL,
    `heading` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flights` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aircraft_id` INTEGER NOT NULL,
    `origin_airport_id` INTEGER NOT NULL,
    `destination_airport_id` INTEGER NOT NULL,
    `status` ENUM('scheduled', 'enroute', 'landing', 'landed') NOT NULL DEFAULT 'scheduled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `flights_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flight_positions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `flight_id` INTEGER NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `altitude` DOUBLE NOT NULL,
    `heading` DOUBLE NOT NULL,
    `speed` DOUBLE NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_position_latest`(`flight_id`, `recorded_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `runway_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `runway_id` INTEGER NOT NULL,
    `flight_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cleared_at` DATETIME(3) NULL,

    INDEX `idx_runway_occupancy`(`runway_id`, `cleared_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `flight_id` INTEGER NOT NULL,
    `type` ENUM('conflict', 'proximity', 'runway') NOT NULL,
    `message` TEXT NOT NULL,
    `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `runways` ADD CONSTRAINT `runways_airport_id_fkey` FOREIGN KEY (`airport_id`) REFERENCES `airports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_aircraft_id_fkey` FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_origin_airport_id_fkey` FOREIGN KEY (`origin_airport_id`) REFERENCES `airports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_destination_airport_id_fkey` FOREIGN KEY (`destination_airport_id`) REFERENCES `airports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flight_positions` ADD CONSTRAINT `flight_positions_flight_id_fkey` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `runway_assignments` ADD CONSTRAINT `runway_assignments_runway_id_fkey` FOREIGN KEY (`runway_id`) REFERENCES `runways`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `runway_assignments` ADD CONSTRAINT `runway_assignments_flight_id_fkey` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_flight_id_fkey` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
