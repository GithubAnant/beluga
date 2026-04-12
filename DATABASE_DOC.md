# Beluga - Database Documentation

**Beluga** is an Air Traffic Control (ATC) simulator. Think of it like a video game where you watch airplanes fly around on a map, land on runways, and get alerts when two planes get too close. Everything the app shows on screen comes from a **MySQL database** underneath.

This document explains every single database interaction: what tables exist, how they connect, and exactly what SQL runs when you click a button or load a page.

---

## Table of Contents

1. [The Database](#1-the-database)
2. [The Tables (Schema)](#2-the-tables-schema)
3. [How Tables Connect (Relationships)](#3-how-tables-connect-relationships)
4. [Indexes](#4-indexes)
5. [The Seed Button (Populating the DB)](#5-the-seed-button-populating-the-db)
6. [Page-by-Page: What You See vs What SQL Runs](#6-page-by-page-what-you-see-vs-what-sql-runs)
7. [The Simulation Engine (Automatic DB Writes)](#7-the-simulation-engine-automatic-db-writes)
8. [The SQL Query Editor](#8-the-sql-query-editor)
9. [Transactions (Multiple Queries That Must All Succeed)](#9-transactions-multiple-queries-that-must-all-succeed)
10. [Constraint Enforcement](#10-constraint-enforcement)
11. [Raw SQL vs ORM](#11-raw-sql-vs-orm)

---

## 1. The Database

- **Database engine:** MySQL
- **Connection:** `mysql://root:...@localhost:3306/beluga`
- **ORM:** Prisma (translates code into SQL behind the scenes)
- **Schema file:** `prisma/schema.prisma` (the source of truth for all tables)

The app connects to a local MySQL server. Prisma is a tool that lets us write JavaScript-looking code that gets turned into real SQL queries. Sometimes we also write **raw SQL** directly for complex queries (analytics, position lookups, conflict detection).

---

## 2. The Tables (Schema)

The database has **7 tables**. Here is the exact SQL that creates them (from the migration file):

### airports
Stores every airport (name, 3-letter code, and GPS coordinates).

```sql
CREATE TABLE airports (
    id        INTEGER NOT NULL AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    code      VARCHAR(10) NOT NULL,
    latitude  DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,

    UNIQUE INDEX airports_code_key(code),
    PRIMARY KEY (id)
);
```

### aircraft
Stores every airplane (its callsign like "AI101", what type of plane, and which airline).

```sql
CREATE TABLE aircraft (
    id        INTEGER NOT NULL AUTO_INCREMENT,
    callsign  VARCHAR(20) NOT NULL,
    type      VARCHAR(50) NOT NULL,
    airline   VARCHAR(100) NOT NULL,

    UNIQUE INDEX aircraft_callsign_key(callsign),
    PRIMARY KEY (id)
);
```

### runways
Each runway belongs to an airport. Has a name (like "09/27"), a length, and a compass heading.

```sql
CREATE TABLE runways (
    id         INTEGER NOT NULL AUTO_INCREMENT,
    airport_id INTEGER NOT NULL,
    name       VARCHAR(20) NOT NULL,
    length_m   INTEGER NOT NULL,
    heading    INTEGER NOT NULL,

    PRIMARY KEY (id)
);
```

### flights
A flight connects one aircraft to an origin airport and a destination airport. It has a status that changes over time: `scheduled` -> `enroute` -> `landing` -> `landed`.

```sql
CREATE TABLE flights (
    id                     INTEGER NOT NULL AUTO_INCREMENT,
    aircraft_id            INTEGER NOT NULL,
    origin_airport_id      INTEGER NOT NULL,
    destination_airport_id INTEGER NOT NULL,
    status                 ENUM('scheduled', 'enroute', 'landing', 'landed') NOT NULL DEFAULT 'scheduled',
    created_at             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at             DATETIME(3) NOT NULL,

    INDEX flights_status_idx(status),
    PRIMARY KEY (id)
);
```

### flight_positions
Every few seconds, the simulation records WHERE a flight is (latitude, longitude, altitude, heading, speed). This is how the map knows where to draw the airplane icon.

```sql
CREATE TABLE flight_positions (
    id          INTEGER NOT NULL AUTO_INCREMENT,
    flight_id   INTEGER NOT NULL,
    latitude    DOUBLE NOT NULL,
    longitude   DOUBLE NOT NULL,
    altitude    DOUBLE NOT NULL,
    heading     DOUBLE NOT NULL,
    speed       DOUBLE NOT NULL,
    recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX idx_position_latest(flight_id, recorded_at DESC),
    PRIMARY KEY (id)
);
```

### runway_assignments
Tracks which flight is currently using which runway. When a flight is assigned a runway, a row is created. When the flight lands, `cleared_at` gets set.

```sql
CREATE TABLE runway_assignments (
    id          INTEGER NOT NULL AUTO_INCREMENT,
    runway_id   INTEGER NOT NULL,
    flight_id   INTEGER NOT NULL,
    assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    cleared_at  DATETIME(3) NULL,

    INDEX idx_runway_occupancy(runway_id, cleared_at),
    PRIMARY KEY (id)
);
```

### alerts
When two planes get dangerously close, the system creates an alert. Alerts have a type, severity, and can be resolved later.

```sql
CREATE TABLE alerts (
    id          INTEGER NOT NULL AUTO_INCREMENT,
    flight_id   INTEGER NOT NULL,
    type        ENUM('conflict', 'proximity', 'runway') NOT NULL,
    message     TEXT NOT NULL,
    severity    ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    resolved_at DATETIME(3) NULL,

    PRIMARY KEY (id)
);
```

---

## 3. How Tables Connect (Relationships)

These are the **foreign key constraints** -- they enforce that you can't create a flight for an aircraft that doesn't exist, etc.

```sql
-- A runway must belong to a real airport
ALTER TABLE runways ADD CONSTRAINT runways_airport_id_fkey
    FOREIGN KEY (airport_id) REFERENCES airports(id);

-- A flight must have a real aircraft
ALTER TABLE flights ADD CONSTRAINT flights_aircraft_id_fkey
    FOREIGN KEY (aircraft_id) REFERENCES aircraft(id);

-- A flight must fly FROM a real airport
ALTER TABLE flights ADD CONSTRAINT flights_origin_airport_id_fkey
    FOREIGN KEY (origin_airport_id) REFERENCES airports(id);

-- A flight must fly TO a real airport
ALTER TABLE flights ADD CONSTRAINT flights_destination_airport_id_fkey
    FOREIGN KEY (destination_airport_id) REFERENCES airports(id);

-- A position must belong to a real flight
ALTER TABLE flight_positions ADD CONSTRAINT flight_positions_flight_id_fkey
    FOREIGN KEY (flight_id) REFERENCES flights(id);

-- A runway assignment must reference a real runway
ALTER TABLE runway_assignments ADD CONSTRAINT runway_assignments_runway_id_fkey
    FOREIGN KEY (runway_id) REFERENCES runways(id);

-- A runway assignment must reference a real flight
ALTER TABLE runway_assignments ADD CONSTRAINT runway_assignments_flight_id_fkey
    FOREIGN KEY (flight_id) REFERENCES flights(id);

-- An alert must reference a real flight
ALTER TABLE alerts ADD CONSTRAINT alerts_flight_id_fkey
    FOREIGN KEY (flight_id) REFERENCES flights(id);
```

In plain English, the relationship diagram looks like:

```
airports ──< runways ──< runway_assignments >── flights
airports ──< flights (as origin)                  │
airports ──< flights (as destination)             │
aircraft ──< flights                               │
              flights ──< flight_positions         │
              flights ──< alerts                   │
```

(`──<` means "one-to-many", so one airport has many runways)

---

## 4. Indexes

Indexes make certain queries fast. The database creates a shortcut so it doesn't have to scan every row.

| Index Name | Table | Columns | Why It Exists |
|---|---|---|---|
| `airports_code_key` | airports | `code` | Enforces unique airport codes + fast lookup by code |
| `aircraft_callsign_key` | aircraft | `callsign` | Enforces unique callsigns + fast lookup |
| `flights_status_idx` | flights | `status` | Fast filtering of flights by status (e.g. "give me all enroute flights") |
| `idx_position_latest` | flight_positions | `flight_id, recorded_at DESC` | Fast lookup of the most recent position for a flight |
| `idx_runway_occupancy` | runway_assignments | `runway_id, cleared_at` | Fast check if a runway is currently occupied |

---

## 5. The Seed Button (Populating the DB)

When you click **"Seed Database"**, it wipes everything and fills the DB with sample data. This is the order of operations (order matters because of foreign keys!):

**Step 1: Delete everything (child tables first)**
```sql
DELETE FROM alerts;
DELETE FROM runway_assignments;
DELETE FROM flight_positions;
DELETE FROM flights;
DELETE FROM runways;
DELETE FROM aircraft;
DELETE FROM airports;
```

**Step 2: Insert 56 airports**
```sql
INSERT INTO airports (name, code, latitude, longitude)
VALUES ('Indira Gandhi International', 'DEL', 28.5562, 77.1);
-- ... repeated 55 more times for BOM, BLR, CCU, JFK, LHR, DXB, etc.
```

**Step 3: Insert 3 runways for Delhi**
```sql
INSERT INTO runways (airport_id, name, heading, length_m)
VALUES
    (<DEL_id>, '09/27', 90, 3810),
    (<DEL_id>, '10/28', 100, 4430),
    (<DEL_id>, '11/29', 110, 2813);
```

**Step 4: Insert 8 aircraft**
```sql
INSERT INTO aircraft (callsign, type, airline)
VALUES ('AI101', 'Boeing 787-8', 'Air India');
-- ... repeated for 6E202, UK303, SG404, AI505, 6E606, UK707, SG808
```

**Step 5: Insert 6 flights**
```sql
-- 3 enroute flights heading to Delhi
INSERT INTO flights (aircraft_id, origin_airport_id, destination_airport_id, status)
VALUES (<AI101_id>, <BOM_id>, <DEL_id>, 'enroute');

-- 2 scheduled flights departing from Delhi
INSERT INTO flights (aircraft_id, origin_airport_id, destination_airport_id, status)
VALUES (<SG404_id>, <DEL_id>, <BOM_id>, 'scheduled');

-- 1 landing flight
INSERT INTO flights (aircraft_id, origin_airport_id, destination_airport_id, status)
VALUES (<6E606_id>, <BOM_id>, <DEL_id>, 'landing');
```

**Step 6: Insert 4 initial positions**
```sql
INSERT INTO flight_positions (flight_id, latitude, longitude, altitude, heading, speed)
VALUES
    (<enroute1_id>, 26.5, 75.5, 35000, 35, 480),
    (<enroute2_id>, 25.8, 77.3, 33000, 10, 450),
    (<enroute3_id>, 27.5, 79.8, 34000, 300, 460),
    (<landing_id>,  28.8, 77.3, 8000,  200, 220);
```

---

## 6. Page-by-Page: What You See vs What SQL Runs

### Map Page (Home)

The map shows airplane icons moving in real time. To know where to draw each icon, it fetches the **latest position** for every active flight.

**What loads the map markers -- raw SQL:**
```sql
SELECT fp.*, f.status, a.callsign
FROM flight_positions fp
INNER JOIN (
    SELECT flight_id, MAX(recorded_at) as max_time
    FROM flight_positions
    GROUP BY flight_id
) latest ON fp.flight_id = latest.flight_id
        AND fp.recorded_at = latest.max_time
INNER JOIN flights f ON fp.flight_id = f.id
INNER JOIN aircraft a ON f.aircraft_id = a.id
WHERE f.status NOT IN ('cancelled')
```

This uses a **self-join with a subquery** -- the inner query finds the newest timestamp per flight, then the outer query grabs the full row for that timestamp.

**Conflict detection (red lines between planes) -- raw SQL:**
```sql
SELECT fp.*, f.status, a.callsign
FROM flight_positions fp
INNER JOIN (
    SELECT flight_id, MAX(recorded_at) as max_time
    FROM flight_positions
    GROUP BY flight_id
) latest ON fp.flight_id = latest.flight_id
        AND fp.recorded_at = latest.max_time
INNER JOIN flights f ON fp.flight_id = f.id
INNER JOIN aircraft a ON f.aircraft_id = a.id
WHERE f.status != 'landed' AND f.status != 'scheduled'
```

After fetching positions, the app compares every pair of flights and flags any that are within 50km horizontally AND 1000ft vertically.

---

### Flights Page

Displays a table of all flights with their aircraft, origin, destination, and current position.

**Loading the flights list:**
```sql
-- First: get all flights with their related data
SELECT f.*, a.*, orig.*, dest.*
FROM flights f
JOIN aircraft a ON f.aircraft_id = a.id
JOIN airports orig ON f.origin_airport_id = orig.id
JOIN airports dest ON f.destination_airport_id = dest.id;

-- Then for EACH flight: get its latest position
SELECT * FROM flight_positions
WHERE flight_id = <id>
ORDER BY recorded_at DESC
LIMIT 1;
```

**"Add Flight" button:**
```sql
-- Inside a transaction:
INSERT INTO flights (aircraft_id, origin_airport_id, destination_airport_id, status)
VALUES (<aircraftId>, <originId>, <destId>, 'scheduled');

-- If status is 'enroute' or 'landing', also insert initial position:
SELECT * FROM airports WHERE id = <destinationId>;  -- to calculate heading

INSERT INTO flight_positions (flight_id, latitude, longitude, altitude, heading, speed)
VALUES (<newFlightId>, <originLat>, <originLon>, 35000, <calculatedHeading>, 450);
```

**"Edit Flight" button (change status to landed):**
```sql
-- Inside a transaction:
-- Step 1: Clear any active runway assignment
UPDATE runway_assignments
SET cleared_at = NOW()
WHERE flight_id = <id> AND cleared_at IS NULL;

-- Step 2: Update the flight
UPDATE flights
SET status = 'landed'
WHERE id = <id>;
```

**"Delete Flight" button:**
```sql
-- Inside a transaction (delete children first, then the flight):
DELETE FROM flight_positions WHERE flight_id = <id>;
DELETE FROM runway_assignments WHERE flight_id = <id>;
DELETE FROM alerts WHERE flight_id = <id>;
DELETE FROM flights WHERE id = <id>;
```

---

### Airports Page

Shows a table of all airports with how many runways each has, and how many flights depart/arrive there.

**Loading the airports list:**
```sql
SELECT a.*, r.*,
    (SELECT COUNT(*) FROM flights WHERE origin_airport_id = a.id) AS origin_flights_count,
    (SELECT COUNT(*) FROM flights WHERE destination_airport_id = a.id) AS dest_flights_count
FROM airports a
LEFT JOIN runways r ON a.id = r.airport_id
ORDER BY a.id ASC;
```

**"Add Airport" button:**
```sql
INSERT INTO airports (name, code, latitude, longitude)
VALUES ('New Airport', 'XYZ', 12.34, 56.78);
```
If the code already exists, MySQL rejects it (unique constraint) and the app shows "An airport with this code already exists".

**"Edit Airport" button:**
```sql
UPDATE airports
SET name = 'New Name', code = 'NEW', latitude = 12.34, longitude = 56.78
WHERE id = <id>;
```

**"Delete Airport" button:**
```sql
-- First: safety check -- are there any flights using this airport?
SELECT COUNT(*) FROM flights
WHERE origin_airport_id = <id> OR destination_airport_id = <id>;

-- If count > 0: REFUSE to delete (shows error message)
-- If count = 0: delete in a transaction:
SELECT id FROM runways WHERE airport_id = <id>;              -- find runway IDs
DELETE FROM runway_assignments WHERE runway_id IN (<ids>);    -- delete their assignments
DELETE FROM runways WHERE airport_id = <id>;                  -- delete the runways
DELETE FROM airports WHERE id = <id>;                         -- finally delete the airport
```

---

### Fleet Page (Aircraft)

Shows all aircraft with a count of how many flights each has.

**Loading the aircraft list:**
```sql
SELECT a.*, (SELECT COUNT(*) FROM flights WHERE aircraft_id = a.id) AS flights_count
FROM aircraft a
ORDER BY a.id ASC;
```

**"Add Aircraft" button:**
```sql
INSERT INTO aircraft (callsign, type, airline)
VALUES ('AI999', 'Boeing 787', 'Air India');
```

**"Edit Aircraft" button:**
```sql
UPDATE aircraft SET callsign = 'AI999', type = 'Boeing 787', airline = 'Air India'
WHERE id = <id>;
```

**"Delete Aircraft" button:**
```sql
DELETE FROM aircraft WHERE id = <id>;
```
If flights exist for this aircraft, the foreign key constraint blocks deletion and the app shows "Cannot delete aircraft with existing flights."

---

### Runways Section

**Loading runways with active assignments:**
```sql
SELECT r.*, ap.*, ra.*, f.*, ac.*
FROM runways r
JOIN airports ap ON r.airport_id = ap.id
LEFT JOIN runway_assignments ra ON r.id = ra.runway_id AND ra.cleared_at IS NULL
LEFT JOIN flights f ON ra.flight_id = f.id
LEFT JOIN aircraft ac ON f.aircraft_id = ac.id;
```

The `cleared_at IS NULL` filter is key -- it only shows runways that are **currently occupied**.

**"Add Runway" button:**
```sql
INSERT INTO runways (airport_id, name, length_m, heading)
VALUES (<airportId>, '09/27', 3810, 90);
```

**"Assign Flight to Runway" button:**
```sql
-- Validation queries first:
SELECT * FROM runways WHERE id = <runwayId>;                          -- runway exists?
SELECT * FROM runway_assignments WHERE runway_id = <id> AND cleared_at IS NULL;  -- runway free?
SELECT * FROM flights WHERE id = <flightId>;                          -- flight exists & enroute?

-- Then in a transaction:
INSERT INTO runway_assignments (runway_id, flight_id) VALUES (<runwayId>, <flightId>);
UPDATE flights SET status = 'landing' WHERE id = <flightId>;
```

**"Clear Runway" button:**
```sql
-- Find who's on the runway:
SELECT * FROM runway_assignments WHERE runway_id = <id> AND cleared_at IS NULL;

-- Then in a transaction:
UPDATE runway_assignments SET cleared_at = NOW() WHERE id = <assignmentId>;
UPDATE flights SET status = 'landed' WHERE id = <flightId>;
```

**"Delete Runway" button:**
```sql
-- Safety check:
SELECT * FROM runway_assignments WHERE runway_id = <id> AND cleared_at IS NULL LIMIT 1;
-- If active: REFUSE

-- Otherwise, in a transaction:
DELETE FROM runway_assignments WHERE runway_id = <id>;
DELETE FROM runways WHERE id = <id>;
```

---

### Alerts Section

Shows unresolved safety alerts (two planes too close).

**Loading alerts:**
```sql
SELECT al.*, f.*, ac.*
FROM alerts al
JOIN flights f ON al.flight_id = f.id
JOIN aircraft ac ON f.aircraft_id = ac.id
WHERE al.resolved_at IS NULL
ORDER BY al.created_at DESC;
```

**"Resolve Alert" button:**
```sql
-- First check:
SELECT * FROM alerts WHERE id = <id>;            -- does it exist?
-- (also checks if already resolved)

-- Then:
UPDATE alerts SET resolved_at = NOW() WHERE id = <id>;
```

---

### Analytics Page

This page is the most SQL-heavy. It shows charts and numbers that are all computed with **raw SQL aggregate queries**.

#### Overview Tab

**Total counts across all tables (one query, 6 subqueries):**
```sql
SELECT
    (SELECT COUNT(*) FROM flights)          AS total_flights,
    (SELECT COUNT(*) FROM aircraft)         AS total_aircraft,
    (SELECT COUNT(*) FROM airports)         AS total_airports,
    (SELECT COUNT(*) FROM runways)          AS total_runways,
    (SELECT COUNT(*) FROM flight_positions) AS total_positions,
    (SELECT COUNT(*) FROM alerts)           AS total_alerts
```

**Flights grouped by status:**
```sql
SELECT status, COUNT(*) AS count
FROM flights
GROUP BY status
ORDER BY count DESC
```

**Average number of position records per flight (subquery + aggregate):**
```sql
SELECT ROUND(AVG(pos_count), 1) AS avg_positions
FROM (
    SELECT flight_id, COUNT(*) AS pos_count
    FROM flight_positions
    GROUP BY flight_id
) AS sub
```

#### Alerts Tab

**Alerts grouped by severity (with custom sort using FIELD):**
```sql
SELECT severity, COUNT(*) AS count
FROM alerts
GROUP BY severity
ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low')
```
`FIELD()` is a MySQL function that lets you sort by a custom order instead of alphabetical.

**Alerts grouped by type:**
```sql
SELECT type, COUNT(*) AS count
FROM alerts
GROUP BY type
ORDER BY count DESC
```

**Resolution statistics (uses CASE WHEN for conditional counting):**
```sql
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS unresolved,
    ROUND(
        SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0
        / NULLIF(COUNT(*), 0),
        1
    ) AS resolution_rate
FROM alerts
```
`NULLIF(COUNT(*), 0)` prevents division by zero if there are no alerts.

#### Airports Tab

**Airport stats (JOINs + conditional SUM + GROUP BY):**
```sql
SELECT
    ap.code,
    ap.name,
    COUNT(DISTINCT r.id) AS runway_count,
    SUM(CASE WHEN f.origin_airport_id = ap.id THEN 1 ELSE 0 END) AS departures,
    SUM(CASE WHEN f.destination_airport_id = ap.id THEN 1 ELSE 0 END) AS arrivals
FROM airports ap
LEFT JOIN runways r ON ap.id = r.airport_id
LEFT JOIN flights f ON ap.id = f.origin_airport_id OR ap.id = f.destination_airport_id
GROUP BY ap.id, ap.code, ap.name
ORDER BY (departures + arrivals) DESC
```

**Runway utilization:**
```sql
SELECT
    r.name AS runway_name,
    ap.code AS airport_code,
    COUNT(ra.id) AS total_assignments,
    SUM(CASE WHEN ra.cleared_at IS NULL THEN 1 ELSE 0 END) AS active_now
FROM runways r
JOIN airports ap ON r.airport_id = ap.id
LEFT JOIN runway_assignments ra ON r.id = ra.runway_id
GROUP BY r.id, r.name, ap.code
ORDER BY total_assignments DESC
```

#### Airlines Tab

**Airlines summary:**
```sql
SELECT
    a.airline,
    COUNT(DISTINCT a.id) AS aircraft_count,
    COUNT(f.id) AS flight_count
FROM aircraft a
LEFT JOIN flights f ON a.id = f.aircraft_id
GROUP BY a.airline
ORDER BY flight_count DESC
```

**Detailed aircraft list:**
```sql
SELECT
    a.callsign,
    a.type,
    a.airline,
    COUNT(f.id) AS flight_count,
    MAX(f.created_at) AS last_flight
FROM aircraft a
LEFT JOIN flights f ON a.id = f.aircraft_id
GROUP BY a.id, a.callsign, a.type, a.airline
ORDER BY flight_count DESC
```

---

## 7. The Simulation Engine (Automatic DB Writes)

When you click **"Start Simulation"**, a timer runs every **2 seconds** and does these database operations automatically:

**Tick Step 1 -- Fetch active flights:**
```sql
SELECT f.*, dest.*, ac.*
FROM flights f
JOIN airports dest ON f.destination_airport_id = dest.id
JOIN aircraft ac ON f.aircraft_id = ac.id
WHERE f.status IN ('enroute', 'landing');
```

**Tick Step 2 -- For each active flight, get its latest position:**
```sql
SELECT * FROM flight_positions
WHERE flight_id = <id>
ORDER BY recorded_at DESC
LIMIT 1;
```

**Tick Step 3 -- Insert a new position (the plane moved!):**
```sql
INSERT INTO flight_positions (flight_id, latitude, longitude, altitude, heading, speed)
VALUES (<id>, <newLat>, <newLon>, <newAlt>, <newHeading>, <newSpeed>);
```

**Tick Step 4 -- If a plane is within 30km of destination, change status to landing:**
```sql
UPDATE flights SET status = 'landing' WHERE id = <id>;
```

**Tick Step 5 -- If a landing plane's altitude drops below 500ft, it has landed:**
```sql
UPDATE flights SET status = 'landed' WHERE id = <id>;

-- Also clear its runway:
UPDATE runway_assignments SET cleared_at = NOW()
WHERE flight_id = <id> AND cleared_at IS NULL;
```

**Tick Step 6 -- Conflict detection (runs every tick):**
```sql
-- Same raw SQL as the conflicts endpoint:
SELECT fp.flight_id, fp.latitude, fp.longitude, fp.altitude, a.callsign
FROM flight_positions fp
INNER JOIN (
    SELECT flight_id, MAX(recorded_at) as max_time
    FROM flight_positions
    GROUP BY flight_id
) latest ON fp.flight_id = latest.flight_id AND fp.recorded_at = latest.max_time
INNER JOIN flights f ON fp.flight_id = f.id
INNER JOIN aircraft a ON f.aircraft_id = a.id
WHERE f.status != 'landed' AND f.status != 'scheduled'
```

If two flights are dangerously close, before creating alerts it checks for duplicates:
```sql
SELECT * FROM alerts
WHERE type = 'conflict'
  AND resolved_at IS NULL
  AND flight_id = <flightA_id>
  AND message LIKE '%<flightB_callsign>%'
LIMIT 1;
```

If no existing alert, it creates one for **both** flights:
```sql
INSERT INTO alerts (flight_id, type, severity, message)
VALUES
    (<flightA_id>, 'conflict', '<severity>', 'Conflict with <B_callsign>: ...'),
    (<flightB_id>, 'conflict', '<severity>', 'Conflict with <A_callsign>: ...');
```

---

## 8. The SQL Query Editor

The app has a page where you can type **any SQL query** and run it directly against the database.

For **read** queries (SELECT, SHOW, DESCRIBE, EXPLAIN):
```
prisma.$queryRawUnsafe(userQuery)
→ Returns: { columns, rows, rowCount, executionTime }
```

For **write** queries (INSERT, UPDATE, DELETE, etc.):
```
prisma.$executeRawUnsafe(userQuery)
→ Returns: { affectedRows, executionTime }
```

This is basically a mini phpMyAdmin built into the app.

---

## 9. Transactions (Multiple Queries That Must All Succeed)

Several operations use **database transactions** -- if any step fails, ALL steps are rolled back. The SQL equivalent is `BEGIN; ... COMMIT;` (or `ROLLBACK;` on failure).

| Operation | What's in the transaction | Why |
|---|---|---|
| Create flight (enroute) | INSERT flight + INSERT initial position | Can't have a flying plane with no position |
| Mark flight as landed | UPDATE runway_assignment cleared_at + UPDATE flight status | Runway must be freed at the same time |
| Delete flight | DELETE positions + DELETE runway_assignments + DELETE alerts + DELETE flight | Must remove all child rows before parent (foreign keys) |
| Delete airport | DELETE runway_assignments + DELETE runways + DELETE airport | Same reason -- children first |
| Delete runway | DELETE runway_assignments + DELETE runway | Same |
| Assign runway | INSERT runway_assignment + UPDATE flight status to 'landing' | Both must happen together |
| Clear runway | UPDATE assignment cleared_at + UPDATE flight status to 'landed' | Both must happen together |

---

## 10. Constraint Enforcement

The database protects data integrity in several ways:

| Constraint | What it prevents | User-facing message |
|---|---|---|
| `UNIQUE airports.code` | Two airports with same code | "An airport with this code already exists" |
| `UNIQUE aircraft.callsign` | Two planes with same callsign | "An aircraft with this callsign already exists" |
| `FOREIGN KEY flights.aircraft_id` | Deleting aircraft that has flights | "Cannot delete aircraft with existing flights" |
| `FOREIGN KEY flights.origin_airport_id` | Deleting airport that has flights | "Cannot delete airport with N existing flight(s)" |
| Application-level check | Deleting runway with active assignment | "Cannot delete runway with an active assignment" |
| Application-level check | Assigning occupied runway | "Runway is already occupied" |
| Application-level check | Assigning runway to non-enroute flight | "Flight must be enroute or landing" |
| Application-level check | Resolving already-resolved alert | "Alert is already resolved" |

---

## 11. Raw SQL vs ORM

The app uses **two ways** to talk to the database:

### Prisma ORM (most operations)
Code like this:
```javascript
prisma.flight.findMany({
    include: { aircraft: true, originAirport: true }
})
```
Gets translated by Prisma into:
```sql
SELECT f.*, a.*, ap.*
FROM flights f
JOIN aircraft a ON f.aircraft_id = a.id
JOIN airports ap ON f.origin_airport_id = ap.id
```

### Raw SQL (complex queries)
For analytics, position lookups, and conflict detection, the app writes SQL directly:
```javascript
prisma.$queryRaw`SELECT status, COUNT(*) AS count FROM flights GROUP BY status`
```
This runs exactly the SQL you see -- no translation. Used when the query has subqueries, CASE WHEN, FIELD(), or complex JOINs that the ORM can't express cleanly.

### Summary of which uses which:

| Feature | Method |
|---|---|
| CRUD operations (create, read, update, delete) | Prisma ORM |
| Analytics (counts, averages, grouping) | Raw SQL |
| Latest position lookup (self-join subquery) | Raw SQL |
| Conflict detection | Raw SQL |
| SQL query editor | Raw SQL (`$queryRawUnsafe` / `$executeRawUnsafe`) |
| Seed data | Prisma ORM |
| Simulation tick | Mix (ORM for updates, raw SQL for conflict detection) |
