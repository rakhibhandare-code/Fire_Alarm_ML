
USE fire_alarm_db;

-- STEP 1: Check MySQL version
SELECT VERSION();

-- STEP 2: Make old MQ-2 column optional
ALTER TABLE sensor_readings
MODIFY COLUMN mq2_raw INT NULL;

-- STEP 3: Add MQ-4 columns only when missing

-- Check and add mq4_voltage
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'fire_alarm_db'
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'mq4_voltage'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE sensor_readings ADD COLUMN mq4_voltage FLOAT NULL',
    'SELECT "mq4_voltage already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- Check and add rs_kohm
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'fire_alarm_db'
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'rs_kohm'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE sensor_readings ADD COLUMN rs_kohm FLOAT NULL',
    'SELECT "rs_kohm already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- Check and add ch4_ppm_approx
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'fire_alarm_db'
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'ch4_ppm_approx'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE sensor_readings ADD COLUMN ch4_ppm_approx FLOAT NULL',
    'SELECT "ch4_ppm_approx already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- STEP 4: Verify complete table structure
DESCRIBE sensor_readings;


-- STEP 5: View latest 5 sensor readings
SELECT
    id,
    temperature_c,
    humidity_percent,
    mq2_raw,
    mq4_voltage,
    rs_kohm,
    ch4_ppm_approx,
    prediction,
    created_at
FROM sensor_readings
ORDER BY id DESC
LIMIT 5;
USE fire_alarm_db;

SELECT *
FROM sensor_readings
ORDER BY id DESC
LIMIT 2000;