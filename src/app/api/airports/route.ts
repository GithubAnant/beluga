import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const airports = await prisma.airport.findMany({
      include: {
        runways: true,
        _count: { select: { originFlights: true, destinationFlights: true } },
      },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(airports);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, code, latitude, longitude } = await request.json();
    if (!name || !code || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "name, code, latitude, and longitude are required" },
        { status: 400 }
      );
    }
    const airport = await prisma.airport.create({
      data: { name, code, latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    });
    return NextResponse.json(airport, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An airport with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
