import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stockCheckId = Number(id);

    if (isNaN(stockCheckId)) {
      return NextResponse.json({ error: "Invalid audit ID" }, { status: 400 });
    }

    const check = await db.stockCheck.findUnique({
      where: { id: stockCheckId },
      include: {
        stockCheckDetails: {
          include: {
            item: {
              include: {
                type: true,
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!check) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    return NextResponse.json({ check });
  } catch (error: unknown) {
    console.error("Failed to fetch stock check detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock check detail." },
      { status: 500 }
    );
  }
}
