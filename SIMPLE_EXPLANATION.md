# Beluga - What Does This App Do?

## The Simple Version

Imagine you're standing in a tall tower at an airport, looking out the window. You can see airplanes flying in the sky, coming closer, and landing on long roads called **runways**. That's your job — to watch all the planes and make sure they don't bump into each other.

**Beluga is a game that lets you do exactly that, but on your computer.**

---

## What You See

When you open the app, the main screen is a **dark map** (think Google Maps but in dark mode) centered on Delhi, India. Little airplane icons are scattered across the map. Each one is a flight.

- **Blue planes** = flying through the sky (status: `enroute`)
- **Yellow planes** = coming down to land (status: `landing`)
- **Gray planes** = already on the ground (status: `landed`)

The planes are actually **rotated** to face the direction they're heading. So a plane flying north-east will point north-east on the map.

On the right side there's a **flight list** — a scrollable panel showing every flight's callsign (like "AI101"), which airline it belongs to, altitude, speed, and where it's going. You can click any row to select that flight and the map smoothly pans over to it.

At the bottom, there's an **alerts bar**. If two planes get dangerously close, a warning card appears here with details like "AI101 and 6E202 are 18km apart with only 2000ft vertical separation". Each alert has a severity — critical (red), high (orange), medium (yellow), low.

---

## What You Can Do

### Start the Simulation
Hit the **Start Simulation** button and the planes come alive. Every 2 seconds, every active plane moves a little bit closer to its destination. The map updates in real-time — you can literally watch the icons crawl across India.

### Seed the Database
Hit **Seed Database** and the app fills itself with sample data — 56 airports around the world (Delhi, Mumbai, JFK, Heathrow, Dubai...), 8 aircraft from airlines like Air India, IndiGo, Vistara, and SpiceJet, 3 runways at Delhi airport, and 6 flights in various states.

### Assign Runways
When a plane is approaching, you can assign it to a specific runway. The app checks that the runway isn't already occupied. Once assigned, the flight's status changes to `landing` and it begins descending.

### Clear Runways
After a plane lands, you clear the runway so the next plane can use it. This sets the flight to `landed` and frees up the runway — both happen in a single database transaction so they can't get out of sync.

### Resolve Alerts
When the conflict detection flags two planes as too close, you can manually resolve the alert once the situation is handled.

### Manage Everything
There are dedicated pages to **add, edit, and delete** airports, aircraft, flights, and runways. Each form shows you the actual SQL that will run when you click save, so you can see exactly what's happening in the database.

### Run Raw SQL
There's a built-in **SQL editor** with syntax highlighting where you can type any SQL query and run it directly against the database. It comes with 8 pre-built templates for common queries like "show all flights with their aircraft" or "find the busiest airports".

### View Analytics
The analytics page shows charts and numbers computed entirely through SQL aggregate queries — flight status distributions, airport traffic volumes, airline rankings, runway utilization, and alert resolution rates.

---

## The 6 Pages

| Page | What It Shows |
|---|---|
| **Dashboard** | The live map, flight list, runway controls, and alerts feed — the main control tower view |
| **Flights** | Table of all flights with status, origin, destination. Add/edit/delete flights |
| **Airports** | Card grid of all airports with their runways. Add/edit/delete airports and runways |
| **Fleet** | Table of all aircraft with callsign, type, airline. Add/edit/delete aircraft |
| **Analytics** | Metric cards and data tables — all computed via raw SQL aggregates |
| **SQL Editor** | Type and run any SQL query against the live database |

---

## What's Happening Underneath

Everything you see on the screen comes from a **MySQL database** — 7 tables that store all the data:

| Table | What It Stores | Example Row |
|---|---|---|
| `airports` | Every airport's name, code, and GPS location | DEL, 28.55, 77.10 |
| `aircraft` | Every plane's callsign, type, and airline | AI101, Boeing 787-8, Air India |
| `runways` | Each runway's airport, name, length, heading | 09/27, 3810m, 90 degrees |
| `flights` | Which plane flies from where to where, and its current status | AI101: BOM -> DEL, enroute |
| `flight_positions` | Where a plane is right now — lat, lon, altitude, heading, speed | 26.5, 75.5, 35000ft, 480kts |
| `runway_assignments` | Which flight is on which runway right now | Runway 09/27 occupied by 6E606 |
| `alerts` | Danger warnings when two planes get too close | AI101 vs 6E202: 18km apart, HIGH severity |

The `flight_positions` table is the big one. Every 2 seconds, the simulation inserts a **new row** for every active flight. So after just 1 minute with 4 active flights, that's 120 new rows. This is how the map knows where to draw each plane — it always grabs the **latest** position for each flight.

---

## How the Simulation Engine Works

When you press Start, a **timer** fires every 2 seconds on the server. Each tick does this:

1. **Fetch** all flights that are `enroute` or `landing`, along with their latest position and destination airport
2. **Calculate** the distance to the destination using the haversine formula (accounts for Earth being round)
3. **Move** each plane 0.7–1.2% of the remaining distance toward the destination
4. **Compute** the compass heading (bearing) so the plane icon faces the right way
5. **Adjust altitude and speed** — enroute planes cruise at ~35,000ft with minor random wobble; landing planes descend by up to 800ft per tick and slow down by 20 knots per tick
6. **Insert** the new position into `flight_positions`
7. **Check transitions**:
   - If a plane is within **30km** of the destination → change status to `landing`
   - If a landing plane's altitude drops below **500ft** → change status to `landed` and clear its runway
8. **Detect conflicts** — compare every pair of active flights. If two are within **50km horizontally** AND **1000ft vertically**, create an alert. Severity depends on distance: <10km = critical, <25km = high, <40km = medium, <50km = low

---

## How the Database Protects Itself

The database has rules to prevent bad data:

- **You can't create two airports with the same code** — the `UNIQUE` constraint on `airports.code` rejects it
- **You can't create two planes with the same callsign** — `UNIQUE` on `aircraft.callsign`
- **You can't delete an airport that has flights** — the foreign key on `flights.origin_airport_id` blocks it
- **You can't delete an aircraft that has flights** — same reason, foreign key on `flights.aircraft_id`
- **You can't assign two planes to the same runway** — the app checks for an existing active assignment before allowing it
- **You can't assign a runway to a plane that isn't flying** — the app verifies the flight is `enroute` first

When an operation involves multiple database writes (like deleting a flight, which requires deleting its positions, runway assignments, and alerts first), everything is wrapped in a **transaction**. If any step fails, everything rolls back — the database never ends up in a half-broken state.

---

## The Interesting SQL

The app doesn't just do simple `SELECT * FROM flights`. Some of the queries are genuinely interesting:

**"Where is each plane right now?"** — This uses a **self-join with a subquery**. The inner query finds the most recent timestamp per flight, then the outer query grabs the full position row for that timestamp. This is the classic "latest record per group" problem.

**"Which planes are too close?"** — After getting all latest positions, the app does a **pairwise comparison** of every active flight using the haversine formula to compute distances.

**"How busy is each airport?"** — Uses `CASE WHEN` inside a `SUM()` to count departures and arrivals separately in a single query, with `LEFT JOIN` across airports, runways, and flights.

**"Alert resolution rate?"** — Uses `CASE WHEN` with `NULLIF()` to avoid division by zero when computing the percentage of resolved alerts.

**Custom sort order** — Alerts are sorted by severity using MySQL's `FIELD()` function: `ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low')` instead of alphabetical order.

---

## The Tech Stack

| Layer | Technology | What It Does |
|---|---|---|
| Framework | **Next.js 16** + **React 19** | The entire website — pages, components, API routes, all in one |
| Database | **MySQL** | Stores all 7 tables with foreign keys, indexes, and constraints |
| ORM | **Prisma 6** | Translates TypeScript code into SQL queries. Also handles migrations and schema management |
| Maps | **Leaflet.js** + **react-leaflet** | Renders the interactive dark-themed map with custom airplane markers |
| Data Fetching | **SWR** | Keeps the UI in sync with the database by re-fetching data at intervals (2s for positions, 3s for alerts, 5s for flights) |
| Styling | **Tailwind CSS 4** + **shadcn/ui** | Dark theme UI with accessible components (dialogs, dropdowns, tables, badges) |
| Language | **TypeScript** | Type-safe code across frontend and backend |

---

## Why This Project Exists

This was built for **CS210 DBMS Lab** at Delhi Technological University. The goal was to show that a relational database can do more than store contact lists — it can be the **engine** behind a real-time, interactive system. Every plane moving on the map, every conflict alert, every analytics chart — it's all just SQL queries reading and writing rows. The database *is* the application.
