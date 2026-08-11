import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();
import { db } from "./index";

async function main() {
  console.log("Seeding database...");

  // Seed default plans
  const freePlan = await db.plan.upsert({
    where: { id: "plan_free" },
    update: {
      storageLimitGb: 2,
    },
    create: {
      id: "plan_free",
      name: "free",
      minutesLimit: 200,
      storageLimitGb: 2,
      maxResolution: "1080p",
      seatLimit: 5,
      priceMonthlyCents: 0,
      isCustom: false,
    },
  });

  const proPlan = await db.plan.upsert({
    where: { id: "plan_pro" },
    update: {
      storageLimitGb: 50,
    },
    create: {
      id: "plan_pro",
      name: "pro",
      minutesLimit: 1000,
      storageLimitGb: 50,
      maxResolution: "4k",
      seatLimit: 20,
      priceMonthlyCents: 4900,
      isCustom: false,
    },
  });

  const enterprisePlan = await db.plan.upsert({
    where: { id: "plan_enterprise" },
    update: {
      storageLimitGb: 500,
    },
    create: {
      id: "plan_enterprise",
      name: "enterprise",
      minutesLimit: 10000,
      storageLimitGb: 500,
      maxResolution: "4k",
      seatLimit: 100,
      priceMonthlyCents: 49900,
      isCustom: true,
    },
  });

  console.log("Plans seeded:", { freePlan: freePlan.name, proPlan: proPlan.name, enterprisePlan: enterprisePlan.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
