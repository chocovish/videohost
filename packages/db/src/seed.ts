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
      priceMonthlyCents: 0,
    },
    create: {
      id: "plan_free",
      name: "free",
      minutesLimit: 200,
      storageLimitGb: 2,
      maxResolution: "1080p",
      seatLimit: 1,
      priceMonthlyCents: 0,
      isCustom: false,
    },
  });

  const basicPlan = await db.plan.upsert({
    where: { id: "plan_basic" },
    update: {
      storageLimitGb: 50,
      priceMonthlyCents: 39900,
    },
    create: {
      id: "plan_basic",
      name: "basic",
      minutesLimit: 1000,
      storageLimitGb: 50,
      maxResolution: "1080p",
      seatLimit: 1,
      priceMonthlyCents: 39900,
      isCustom: false,
    },
  });

  const proPlan = await db.plan.upsert({
    where: { id: "plan_pro" },
    update: {
      storageLimitGb: 200,
      priceMonthlyCents: 99900,
    },
    create: {
      id: "plan_pro",
      name: "pro",
      minutesLimit: 10000,
      storageLimitGb: 200,
      maxResolution: "4k",
      seatLimit: 1,
      priceMonthlyCents: 99900,
      isCustom: false,
    },
  });

  const enterprisePlan = await db.plan.upsert({
    where: { id: "plan_enterprise" },
    update: {
      storageLimitGb: 0,
      priceMonthlyCents: 299900,
    },
    create: {
      id: "plan_enterprise",
      name: "enterprise",
      minutesLimit: 100000,
      storageLimitGb: 0, // 0 denotes unlimited storage
      maxResolution: "4k",
      seatLimit: 1000,
      priceMonthlyCents: 299900,
      isCustom: true,
    },
  });

  console.log("Plans seeded:", {
    freePlan: freePlan.name,
    basicPlan: basicPlan.name,
    proPlan: proPlan.name,
    enterprisePlan: enterprisePlan.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
