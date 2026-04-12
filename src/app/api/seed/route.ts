import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const AIRPORTS = [
  { name: "Indira Gandhi International", code: "DEL", lat: 28.5562, lon: 77.1 },
  { name: "Chhatrapati Shivaji Maharaj International", code: "BOM", lat: 19.0896, lon: 72.8656 },
  { name: "Kempegowda International", code: "BLR", lat: 13.1979, lon: 77.7063 },
  { name: "Netaji Subhas Chandra Bose International", code: "CCU", lat: 22.6547, lon: 88.4467 },
  { name: "Rajiv Gandhi International", code: "HYD", lat: 17.2313, lon: 78.4143 },
  { name: "Chennai International", code: "MAA", lat: 12.9944, lon: 80.1808 },
  { name: "Cochin International", code: "COK", lat: 10.1528, lon: 76.4014 },
  { name: "Jaipur International", code: "JAI", lat: 26.8242, lon: 75.8061 },
  { name: "Sardar Vallabhbhai Patel International", code: "AMD", lat: 23.0733, lon: 72.5874 },
  { name: "Pune Lohegaon", code: "PNQ", lat: 18.5188, lon: 73.9304 },
  { name: "Bagdogra", code: "IXB", lat: 26.6818, lon: 88.3286 },
  { name: "Gaya", code: "GAY", lat: 24.7443, lon: 84.9511 },
  { name: "Varanasi International", code: "VNS", lat: 25.4524, lon: 82.8593 },
  { name: "Lucknow Chaudhary Charan Singh", code: "LKO", lat: 26.7606, lon: 80.8895 },
  { name: "Trivandrum International", code: "TRV", lat: 8.4823, lon: 76.9202 },
  { name: "Guwahati Lokapriya Gopinath Bordoloi", code: "GAU", lat: 26.1061, lon: 91.5865 },
  { name: "Bhubaneswar Biju Patnaik", code: "BBI", lat: 20.2444, lon: 85.8178 },
  { name: "Patna Jayaprakash Narayan", code: "PAT", lat: 25.5913, lon: 85.0832 },
  { name: "Srinagar Sheikh-ul-Alam", code: "SXR", lat: 33.9872, lon: 74.7747 },
  { name: "Jammu Satyawati", code: "IXJ", lat: 32.5664, lon: 74.9123 },
  { name: "New York John F. Kennedy", code: "JFK", lat: 40.6413, lon: -73.7781 },
  { name: "Los Angeles International", code: "LAX", lat: 33.9425, lon: -118.4081 },
  { name: "Chicago O'Hare International", code: "ORD", lat: 41.9742, lon: -87.9073 },
  { name: "San Francisco International", code: "SFO", lat: 37.6213, lon: -122.379 },
  { name: "Miami International", code: "MIA", lat: 25.7959, lon: -80.287 },
  { name: "Dallas/Fort Worth International", code: "DFW", lat: 32.8968, lon: -97.038 },
  { name: "Denver International", code: "DEN", lat: 39.8561, lon: -104.6737 },
  { name: "Seattle-Tacoma International", code: "SEA", lat: 47.4502, lon: -122.3088 },
  { name: "Boston Logan International", code: "BOS", lat: 42.3656, lon: -71.0096 },
  { name: "Atlanta Hartsfield-Jackson", code: "ATL", lat: 33.6407, lon: -84.4277 },
  { name: "Houston George Bush Intercontinental", code: "IAH", lat: 29.9902, lon: -95.3368 },
  { name: "London Heathrow", code: "LHR", lat: 51.47, lon: -0.4543 },
  { name: "London Gatwick", code: "LGW", lat: 51.1537, lon: -0.183 },
  { name: "Paris Charles de Gaulle", code: "CDG", lat: 49.0097, lon: 2.5477 },
  { name: "Paris Orly", code: "ORY", lat: 48.7233, lon: 2.3794 },
  { name: "Frankfurt Airport", code: "FRA", lat: 50.0379, lon: 8.5622 },
  { name: "Munich Airport", code: "MUC", lat: 48.3537, lon: 11.775 },
  { name: "Amsterdam Schiphol", code: "AMS", lat: 52.3105, lon: 4.7683 },
  { name: "Dubai International", code: "DXB", lat: 25.2532, lon: 55.3657 },
  { name: "Abu Dhabi International", code: "AUH", lat: 24.4331, lon: 54.4511 },
  { name: "Doha Hamad International", code: "DOH", lat: 25.2731, lon: 51.608 },
  { name: "Singapore Changi", code: "SIN", lat: 1.3644, lon: 103.9915 },
  { name: "Hong Kong International", code: "HKG", lat: 22.308, lon: 113.9185 },
  { name: "Tokyo Narita", code: "NRT", lat: 35.7647, lon: 140.3864 },
  { name: "Tokyo Haneda", code: "HND", lat: 35.5494, lon: 139.7798 },
  { name: "Seoul Incheon International", code: "ICN", lat: 37.4602, lon: 126.4407 },
  { name: "Sydney Kingsford Smith", code: "SYD", lat: -33.9399, lon: 151.1753 },
  { name: "Melbourne Airport", code: "MEL", lat: -37.6690, lon: 144.8410 },
  { name: "Brisbane International", code: "BNE", lat: -27.3945, lon: 153.1218 },
  { name: "Perth International", code: "PER", lat: -31.9502, lon: 115.9672 },
  { name: "Shanghai Pudong International", code: "PVG", lat: 31.1443, lon: 121.8083 },
  { name: "Beijing Capital International", code: "PEK", lat: 40.0799, lon: 116.6031 },
  { name: "Guangzhou Baiyun International", code: "CAN", lat: 23.3924, lon: 113.2988 },
  { name: "Shenzhen Bao'an International", code: "SZX", lat: 22.6393, lon: 113.8108 },
];

export async function POST() {
  try {
    await prisma.alert.deleteMany();
    await prisma.runwayAssignment.deleteMany();
    await prisma.flightPosition.deleteMany();
    await prisma.flight.deleteMany();
    await prisma.runway.deleteMany();
    await prisma.aircraft.deleteMany();
    await prisma.airport.deleteMany();

    const airports = await Promise.all(
      AIRPORTS.map((a) =>
        prisma.airport.create({
          data: { name: a.name, code: a.code, latitude: a.lat, longitude: a.lon },
        })
      )
    );

    const del = airports.find((a) => a.code === "DEL") || airports[0];
    const bom = airports.find((a) => a.code === "BOM") || airports[1];
    const blr = airports.find((a) => a.code === "BLR") || airports[2];
    const ccu = airports.find((a) => a.code === "CCU") || airports[3] || airports.find((a) => a.code === "CCU");

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
        airports: AIRPORTS.length,
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
