import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const items = await db.item.findMany({
      include: {
        type: true,
        grade: true,
      },
      orderBy: [
        { type: { typeName: "asc" } },
        { grade: { gradeName: "asc" } },
      ],
    });

    const types = await db.type.findMany({
      orderBy: { typeName: "asc" },
    });

    const grades = await db.grade.findMany({
      orderBy: { gradeName: "asc" },
    });

    return NextResponse.json({ items, types, grades });
  } catch (error: unknown) {
    console.error("Failed to fetch items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items from database" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { typeId, gradeId, price, stock } = body;

    if (!typeId || !gradeId || price === undefined) {
      return NextResponse.json(
        { error: "typeId, gradeId, and price are required." },
        { status: 400 }
      );
    }

    const item = await db.item.upsert({
      where: {
        typeId_gradeId: {
          typeId: Number(typeId),
          gradeId: Number(gradeId),
        },
      },
      update: {
        price: Number(price),
        ...(stock !== undefined ? { stock: Number(stock) } : {}),
      },
      create: {
        typeId: Number(typeId),
        gradeId: Number(gradeId),
        price: Number(price),
        stock: Number(stock ?? 0),
      },
      include: {
        type: true,
        grade: true,
      },
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error("Failed to create/update item:", error);
    return NextResponse.json(
      { error: "Failed to save item." },
      { status: 500 }
    );
  }
}
