import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const checks = await db.stockCheck.findMany({
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
      orderBy: { checkedAt: "desc" },
    });

    return NextResponse.json({ checks });
  } catch (error: unknown) {
    console.error("Failed to fetch stock checks:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock checks." },
      { status: 500 }
    );
  }
}

interface StockAuditDetailInput {
  itemId: number;
  actualQty: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      checkedBy,
      note,
      reconcileStock,
      details,
    }: {
      checkedBy?: string;
      note?: string;
      reconcileStock?: boolean;
      details: StockAuditDetailInput[];
    } = body;

    if (!details || !Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        { error: "Audit details cannot be empty." },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Create StockCheck header
      const stockCheck = await tx.stockCheck.create({
        data: {
          checkedAt: new Date(),
          checkedBy: checkedBy?.trim() || "Auditor",
          note: note ? note.trim() : null,
        },
      });

      // 2. Process details
      for (const entry of details) {
        const item = await tx.item.findUnique({
          where: { id: entry.itemId },
        });

        if (!item) {
          throw new Error(`Item ${entry.itemId} not found`);
        }

        const systemQty = item.stock;
        const actualQty = Math.max(0, Math.floor(Number(entry.actualQty) || 0));
        const difference = actualQty - systemQty;

        await tx.stockCheckDetail.create({
          data: {
            stockCheckId: stockCheck.id,
            itemId: item.id,
            systemQty,
            actualQty,
            difference,
          },
        });

        // "Option to start a match / reconcile stock"
        if (reconcileStock) {
          await tx.item.update({
            where: { id: item.id },
            data: {
              stock: actualQty,
            },
          });
        }
      }

      return await tx.stockCheck.findUnique({
        where: { id: stockCheck.id },
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
    });

    return NextResponse.json({
      success: true,
      stockCheck: result,
      reconciled: Boolean(reconcileStock),
    });
  } catch (error: unknown) {
    console.error("Stock check failed:", error);
    const msg = error instanceof Error ? error.message : "Failed to record stock audit.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
