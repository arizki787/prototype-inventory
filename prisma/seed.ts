import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding types...");
  const types = [
    { typeName: "jeans" },
    { typeName: "kaos" },
    { typeName: "jaket" },
    { typeName: "kemeja" },
    { typeName: "hoodie" },
  ];

  for (const t of types) {
    await prisma.type.upsert({
      where: { typeName: t.typeName },
      update: {},
      create: t,
    });
  }

  console.log("Seeding grades...");
  const grades = [
    { gradeName: "A" },
    { gradeName: "B" },
    { gradeName: "C" },
  ];

  for (const g of grades) {
    await prisma.grade.upsert({
      where: { gradeName: g.gradeName },
      update: {},
      create: g,
    });
  }

  const allTypes = await prisma.type.findMany();
  const allGrades = await prisma.grade.findMany();

  console.log("Seeding initial items combinations...");
  const defaultPrices: Record<string, Record<string, number>> = {
    jeans: { A: 120000, B: 85000, C: 45000 },
    kaos: { A: 65000, B: 45000, C: 25000 },
    jaket: { A: 150000, B: 100000, C: 60000 },
    kemeja: { A: 75000, B: 55000, C: 30000 },
    hoodie: { A: 135000, B: 90000, C: 50000 },
  };

  const initialStocks: Record<string, Record<string, number>> = {
    jeans: { A: 15, B: 25, C: 10 },
    kaos: { A: 30, B: 50, C: 20 },
    jaket: { A: 12, B: 18, C: 8 },
    kemeja: { A: 20, B: 35, C: 15 },
    hoodie: { A: 10, B: 16, C: 6 },
  };

  for (const t of allTypes) {
    for (const g of allGrades) {
      const price = defaultPrices[t.typeName]?.[g.gradeName] ?? 50000;
      const stock = initialStocks[t.typeName]?.[g.gradeName] ?? 10;

      await prisma.item.upsert({
        where: {
          typeId_gradeId: {
            typeId: t.id,
            gradeId: g.id,
          },
        },
        update: {},
        create: {
          typeId: t.id,
          gradeId: g.id,
          price,
          stock,
        },
      });
    }
  }

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
