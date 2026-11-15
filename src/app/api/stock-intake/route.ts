import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, mode, qty, price, note } = body;

    if (!itemId || qty === undefined) {
      return NextResponse.json(
        { error: "itemId and qty are required." },
        { status: 400 }
      );
    }

    const currentItem = await db.item.findUnique({
      where: { id: Number(itemId) },
      include: { type: true, grade: true },
    });

    if (!currentItem) {
      return NextResponse.json(
        { error: "Item not found." },
        { status: 404 }
      );
    }

    const intakeQty = Number(qty);
    if (isNaN(intakeQty) || intakeQty < 0) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative number." },
        { status: 400 }
      );
    }

    let newStock = currentItem.stock;
    if (mode === "set") {
      newStock = intakeQty;
    } else {
      // default 'add'
      newStock = currentItem.stock + intakeQty;
    }

    const updateData: { stock: number; price?: number } = { stock: newStock };
    if (price !== undefined && price !== null && !isNaN(Number(price))) {
      updateData.price = Number(price);
    }

    const updatedItem = await db.item.update({
      where: { id: currentItem.id },
      data: updateData,
      include: {
        type: true,
        grade: true,
      },
    });

    return NextResponse.json({
      success: true,
      item: updatedItem,
      previousStock: currentItem.stock,
      newStock: updatedItem.stock,
      note: note || null,
    });
  } catch (error: unknown) {
    console.error("Stock intake failed:", error);
    return NextResponse.json(
      { error: "Failed to process stock intake." },
      { status: 500 }
    );
  }
}
