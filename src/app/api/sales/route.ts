import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const sales = await db.sale.findMany({
      include: {
        salesDetails: {
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
      orderBy: { soldAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ sales });
  } catch (error: unknown) {
    console.error("Failed to fetch sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales history." },
      { status: 500 }
    );
  }
}

interface CartItemInput {
  itemId: number;
  qty: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items }: { items: CartItemInput[] } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart cannot be empty." },
        { status: 400 }
      );
    }

    // Atomic transaction for inventory consistency
    const result = await db.$transaction(async (tx) => {
      let calculatedTotal = 0;
      const detailsToCreate: {
        itemId: number;
        qty: number;
        priceAtSale: number;
        subtotal: number;
      }[] = [];

      // 1. Verify availability and stock sufficiency
      for (const cartItem of items) {
        if (!cartItem.itemId || cartItem.qty <= 0) {
          throw new Error("Invalid item ID or quantity in cart.");
        }

        const item = await tx.item.findUnique({
          where: { id: cartItem.itemId },
          include: { type: true, grade: true },
        });

        if (!item) {
          throw new Error(`Item ID ${cartItem.itemId} not found.`);
        }

        // STRICT VALIDATION: Block sales if requested qty > stock
        if (item.stock < cartItem.qty) {
          throw new Error(
            `Insufficient stock for "${item.type.typeName} (${item.grade.gradeName})". Available: ${item.stock}, Requested: ${cartItem.qty}`
          );
        }

        const subtotal = item.price * cartItem.qty;
        calculatedTotal += subtotal;

        detailsToCreate.push({
          itemId: item.id,
          qty: cartItem.qty,
          priceAtSale: item.price,
          subtotal,
        });
      }

      // 2. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          soldAt: new Date(),
          total: calculatedTotal,
        },
      });

      // 3. Create Sale Details & decrement stock
      for (const detail of detailsToCreate) {
        await tx.salesDetail.create({
          data: {
            saleId: sale.id,
            itemId: detail.itemId,
            qty: detail.qty,
            priceAtSale: detail.priceAtSale,
            subtotal: detail.subtotal,
          },
        });

        await tx.item.update({
          where: { id: detail.itemId },
          data: {
            stock: {
              decrement: detail.qty,
            },
          },
        });
      }

      // Return created sale with details
      return await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          salesDetails: {
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
    });

    return NextResponse.json({
      success: true,
      sale: result,
    });
  } catch (error: unknown) {
    console.error("Sale checkout transaction failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process sale.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
