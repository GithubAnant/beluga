import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    // Clear existing data in dependency order
    await prisma.alert.deleteMany();
    await prisma.runwayAssignment.deleteMany();
    await prisma.flightPosition.deleteMany();
    await prisma.flight.deleteMany();
    await prisma.runway.deleteMany();
    await prisma.aircraft.deleteMany();
    await prisma.airport.deleteMany();

    // Create DEL airport
    const del = await prisma.airport.create({
      data: {
        name: "Indira Gandhi International",
        code: "DEL",
        latitude: 28.5562,
        longitude: 77.1,
      },
    });

    // Create origin airports
    const bom = await prisma.airport.create({
      data: {
        name: "Chhatrapati Shivaji Maharaj International",
        code: "BOM",
        latitude: 19.0896,
        longitude: 72.8656,
      },
    });

    const blr = await prisma.airport.create({
      data: {
        name: "Kempegowda International",
        code: "BLR",
        latitude: 13.1979,
        longitude: 77.7063,
      },
    });

    const ccu = await prisma.airport.create({
      data: {
        name: "Netaji Subhas Chandra Bose International",
        code: "CCU",
        latitude: 22.6547,
        longitude: 88.4467,
      },
    });

    // Create runways for DEL
    await prisma.runway.createMany({
      data: [
        { airportId: del.id, name: "09/27", heading: 90, lengthM: 3810 },
        { airportId: del.id, name: "10/28", heading: 100, lengthM: 4430 },
        { airportId: del.id, name: "11/29", heading: 110, lengthM: 2813 },
      ],
    });

    // Create aircraft
    const aircraftData = [
      { callsign: "AI101", type: "Boeing 787-8", airline: "Air India" },
      { callsign: "6E202", type: "Airbus A320neo", airline: "IndiGo" },
      { callsign: "UK303", type: "Airbus A320", airline: "Vistara" },
      { callsign: "SG404", type: "Boeing 737-800", airline: "SpiceJet" },
      { callsign: "AI505", type: "Boeing 777-300ER", airline: "Air India" },
      { callsign: "6E606", type: "Airbus A321neo", airline: "IndiGo" },
      { callsign: "UK707", type: "Boeing 787-9", airline: "Vistara" },
      { callsign: "SG808", type: "Boeing 737 MAX 8", airline: "SpiceJet" },
    ];

    const aircraft = await Promise.all(
      aircraftData.map((a) => prisma.aircraft.create({ data: a }))
    );

    // Create flights
    // 3 enroute (from BOM, BLR, CCU to DEL)
    const enrouteFlights = await Promise.all([
      prisma.flight.create({
        data: {
          aircraftId: aircraft[0].id,
          originAirportId: bom.id,
          destinationAirportId: del.id,
          status: "enroute",
        },
      }),
      prisma.flight.create({
        data: {
          aircraftId: aircraft[1].id,
          originAirportId: blr.id,
          destinationAirportId: del.id,
          status: "enroute",
        },
      }),
      prisma.flight.create({
        data: {
          aircraftId: aircraft[2].id,
          originAirportId: ccu.id,
          destinationAirportId: del.id,
          status: "enroute",
        },
      }),
    ]);

    // 2 scheduled
    await Promise.all([
      prisma.flight.create({
        data: {
          aircraftId: aircraft[3].id,
          originAirportId: del.id,
          destinationAirportId: bom.id,
          status: "scheduled",
        },
      }),
      prisma.flight.create({
        data: {
          aircraftId: aircraft[4].id,
          originAirportId: del.id,
          destinationAirportId: blr.id,
          status: "scheduled",
        },
      }),
    ]);

    // 1 landing
    const landingFlight = await prisma.flight.create({
      data: {
        aircraftId: aircraft[5].id,
        originAirportId: bom.id,
        destinationAirportId: del.id,
        status: "landing",
      },
    });

    // Create initial positions for enroute flights (scattered ~100-300km from DEL)
    const positionData = [
      {
        // AI101 from BOM - southwest of DEL
        flightId: enrouteFlights[0].id,
        latitude: 26.5,
        longitude: 75.5,
        altitude: 35000,
        heading: 35,
        speed: 480,
      },
      {
        // 6E202 from BLR - south of DEL
        flightId: enrouteFlights[1].id,
        latitude: 25.8,
        longitude: 77.3,
        altitude: 33000,
        heading: 10,
        speed: 450,
      },
      {
        // UK303 from CCU - east of DEL
        flightId: enrouteFlights[2].id,
        latitude: 27.5,
        longitude: 79.8,
        altitude: 34000,
        heading: 300,
        speed: 460,
      },
      {
        // 6E606 landing - close to DEL
        flightId: landingFlight.id,
        latitude: 28.8,
        longitude: 77.3,
        altitude: 8000,
        heading: 200,
        speed: 220,
      },
    ];

    await prisma.flightPosition.createMany({ data: positionData });

    return NextResponse.json({
      message: "Database seeded successfully",
      counts: {
        airports: 4,
        runways: 3,
        aircraft: 8,
        flights: 6,
        positions: 4,
      },
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
