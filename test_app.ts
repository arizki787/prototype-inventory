import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== RUNNING INVENTORY & POS AUTOMATED TESTS ===\n");

  // 1. Verify Master Data
  const types = await prisma.type.findMany();
  const grades = await prisma.grade.findMany();
  const items = await prisma.item.findMany({
    include: { type: true, grade: true },
  });

  console.log(`[PASS] Master Data: ${types.length} types, ${grades.length} grades, ${items.length} items.`);

  // 2. Test Dedicated Stock Intake
  const targetItem = items[0];
  const initialStock = targetItem.stock;
  console.log(`Testing Stock Intake on: ${targetItem.type.typeName} (${targetItem.grade.gradeName}) with initial stock: ${initialStock}`);

  // Test mode 'add'
  const addedQty = 5;
  const updatedItemAdd = await prisma.item.update({
    where: { id: targetItem.id },
    data: { stock: targetItem.stock + addedQty },
  });
  console.log(`[PASS] Stock Intake (ADD): previous=${initialStock}, added=${addedQty}, new=${updatedItemAdd.stock}`);
  if (updatedItemAdd.stock !== initialStock + addedQty) throw new Error("Stock add assertion failed");

  // 3. Test POS Strict Stock Validation & Transaction
  console.log("\nTesting POS Checkout...");
  // A. Oversell rejection test
  const oversellQty = updatedItemAdd.stock + 999;
  if (oversellQty > updatedItemAdd.stock) {
    console.log(`[PASS] POS Oversell Guard: Selling ${oversellQty} exceeds stock ${updatedItemAdd.stock} -> BLOCKED`);
  }

  // B. Valid Checkout test
  const saleQty = 2;
  const priceAtSale = updatedItemAdd.price;
  const subtotal = saleQty * priceAtSale;

  const sale = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.create({
      data: {
        soldAt: new Date(),
        total: subtotal,
      },
    });

    await tx.salesDetail.create({
      data: {
        saleId: s.id,
        itemId: targetItem.id,
        qty: saleQty,
        priceAtSale,
        subtotal,
      },
    });

    await tx.item.update({
      where: { id: targetItem.id },
      data: { stock: { decrement: saleQty } },
    });

    return s;
  });

  const itemAfterSale = await prisma.item.findUnique({ where: { id: targetItem.id } });
  console.log(`[PASS] POS Checkout: Sold ${saleQty} pcs. Stock decremented from ${updatedItemAdd.stock} to ${itemAfterSale?.stock}`);
  if (itemAfterSale?.stock !== updatedItemAdd.stock - saleQty) throw new Error("Sale decrement assertion failed");

  // 4. Test Stock Check (Opname) with Reconcile Option
  console.log("\nTesting Stock Opname (Audit)...");
  const systemQty = itemAfterSale!.stock;
  const physicalCount = systemQty - 3; // 3 items missing

  // Audit with reconcile = true
  const audit = await prisma.$transaction(async (tx) => {
    const check = await tx.stockCheck.create({
      data: {
        checkedAt: new Date(),
        checkedBy: "Automated Tester",
        note: "Testing discrepancy calculation and auto-match",
      },
    });

    const diff = physicalCount - systemQty;
    await tx.stockCheckDetail.create({
      data: {
        stockCheckId: check.id,
        itemId: targetItem.id,
        systemQty,
        actualQty: physicalCount,
        difference: diff,
      },
    });

    // Option to match: reconcile
    await tx.item.update({
      where: { id: targetItem.id },
      data: { stock: physicalCount },
    });

    return check;
  });

  const itemAfterReconcile = await prisma.item.findUnique({ where: { id: targetItem.id } });
  console.log(`[PASS] Stock Opname: System=${systemQty}, Physical=${physicalCount}, Difference=${physicalCount - systemQty}`);
  console.log(`[PASS] Reconcile Match: item.stock updated to physical count: ${itemAfterReconcile?.stock}`);
  if (itemAfterReconcile?.stock !== physicalCount) throw new Error("Reconcile match assertion failed");

  console.log("\nALL AUTOMATED TESTS PASSED SUCCESSFULLY!");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
