import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const items = await db.item.findMany({
      include: {
        type: true,
        grade: true,
      },
    });

    const totalStock = items.reduce((acc, curr) => acc + curr.stock, 0);
    const totalValuation = items.reduce(
      (acc, curr) => acc + curr.stock * curr.price,
      0
    );
    const lowStockItems = items.filter((i) => i.stock <= 5);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySales = await db.sale.findMany({
      where: {
        soldAt: {
          gte: todayStart,
        },
      },
    });

    const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    const todayOrdersCount = todaySales.length;

    const allSalesCount = await db.sale.count();

    const lastStockCheck = await db.stockCheck.findFirst({
      orderBy: { checkedAt: "desc" },
      include: {
        stockCheckDetails: true,
      },
    });

    let lastCheckDiscrepancies = 0;
    if (lastStockCheck) {
      lastCheckDiscrepancies = lastStockCheck.stockCheckDetails.filter(
        (d) => d.difference !== 0
      ).length;
    }

    const recentSales = await db.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 6,
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

    return NextResponse.json({
      metrics: {
        totalStock,
        totalValuation,
        totalItemsCount: items.length,
        lowStockCount: lowStockItems.length,
        todayRevenue,
        todayOrdersCount,
        allSalesCount,
        lastStockCheck: lastStockCheck
          ? {
              id: lastStockCheck.id,
              checkedAt: lastStockCheck.checkedAt,
              checkedBy: lastStockCheck.checkedBy,
              discrepancyCount: lastCheckDiscrepancies,
              totalItemsAudited: lastStockCheck.stockCheckDetails.length,
            }
          : null,
      },
      lowStockItems,
      recentSales,
    });
  } catch (error: unknown) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
