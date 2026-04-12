import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const trimmed = query.trim();
    const start = Date.now();

    // Determine if this is a read or write query
    const isRead = /^(SELECT|SHOW|DESCRIBE|EXPLAIN|DESC)\b/i.test(trimmed);

    if (isRead) {
      const rows = await prisma.$queryRawUnsafe(trimmed);
      const elapsed = Date.now() - start;
      const serialized = serializeBigInt(rows) as Record<string, unknown>[];
      const columns = serialized.length > 0 ? Object.keys(serialized[0]) : [];

      return NextResponse.json({
        columns,
        rows: serialized,
        rowCount: serialized.length,
        executionTime: elapsed,
      });
    } else {
      const affected = await prisma.$executeRawUnsafe(trimmed);
      const elapsed = Date.now() - start;

      return NextResponse.json({
        columns: ["affectedRows"],
        rows: [{ affectedRows: affected }],
        rowCount: 1,
        executionTime: elapsed,
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
