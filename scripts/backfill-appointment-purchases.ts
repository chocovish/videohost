/**
 * One-time backfill: ensure every Appointment has a ContentPurchase row.
 * -----------------------------------------------------------------------------------------
 * Appointments historically stored payment details on the Appointment row itself
 * (price / currency / paymentStatus / paymentId — now removed from the schema).
 * ContentPurchase is the single source of truth for purchase details (same as
 * VIDEO / PLAYLIST / MEETING). This script copies the booking-time snapshot from
 * each Appointment into a ContentPurchase so no purchase history is lost when
 * the deprecated Appointment columns are dropped.
 *
 * - Paid appointments get a proper sale split from the org's current plan.
 * - Free appointments get a zero-amount FREE purchase (same as free-claim).
 * - Purchases found via meetingId only are linked back via appointmentId.
 * - Idempotent: safe to re-run; existing purchases are never duplicated.
 *
 * Usage:
 *   npx tsx scripts/backfill-appointment-purchases.ts --dry-run  # Preview only
 *   npx tsx scripts/backfill-appointment-purchases.ts            # Live backfill
 * -----------------------------------------------------------------------------------------
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateSaleSplit } from "../apps/web/lib/platform-fees";

const isDryRun = process.argv.includes("--dry-run");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 500;

async function main() {
  console.log(
    isDryRun
      ? "DRY RUN — no changes will be written."
      : "LIVE RUN — missing ContentPurchase rows will be created."
  );

  const planCache = new Map<string, { name: string; commissionPercent?: number | null }>();

  async function getOrgPlan(organizationId: string) {
    if (!planCache.has(organizationId)) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { plan: true },
      });
      planCache.set(organizationId, {
        name: org?.plan?.name || "free",
        commissionPercent: org?.plan?.commissionPercent ?? null,
      });
    }
    return planCache.get(organizationId)!;
  }

  let cursor: string | undefined;
  let scanned = 0;
  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (;;) {
    const appointments = await prisma.appointment.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        clientEmail: true,
        hostId: true,
        meetingId: true,
        price: true,
        currency: true,
        paymentStatus: true,
        paymentId: true,
        createdAt: true,
      },
    });
    if (appointments.length === 0) break;

    for (const appt of appointments) {
      scanned += 1;
      cursor = appt.id;

      const existing = await prisma.contentPurchase.findFirst({
        where: {
          organizationId: appt.organizationId,
          contentType: "APPOINTMENT",
          OR: [
            { appointmentId: appt.id },
            ...(appt.meetingId ? [{ meetingId: appt.meetingId }] : []),
          ],
        },
      });

      if (existing) {
        if (!existing.appointmentId) {
          if (isDryRun) {
            linked += 1;
          } else {
            await prisma.contentPurchase.update({
              where: { id: existing.id },
              data: { appointmentId: appt.id },
            });
            linked += 1;
          }
        } else {
          skipped += 1;
        }
        continue;
      }

      // Resolve owner: client user, else user matching client email, else host.
      let userId = appt.clientId;
      if (!userId && appt.clientEmail) {
        const u = await prisma.user.findFirst({
          where: { email: appt.clientEmail.toLowerCase().trim() },
          select: { id: true },
        });
        if (u) userId = u.id;
      }
      if (!userId) userId = appt.hostId;

      const boughtAmount = appt.price ?? 0;
      const boughtCurrency = appt.currency || "USD";
      const isPaid = appt.paymentStatus === "PAID" || boughtAmount > 0;

      if (isDryRun) {
        created += 1;
        continue;
      }

      if (isPaid) {
        const plan = await getOrgPlan(appt.organizationId);
        const split = calculateSaleSplit(
          boughtAmount,
          plan.name,
          plan.commissionPercent
        );
        await prisma.contentPurchase.create({
          data: {
            organizationId: appt.organizationId,
            userId,
            contentType: "APPOINTMENT",
            appointmentId: appt.id,
            meetingId: appt.meetingId,
            amount: boughtAmount,
            currency: boughtCurrency,
            commissionPercent: split.commissionPercent,
            commissionAmount: split.commissionAmount,
            gatewayFeePercent: split.gatewayFeePercent,
            gatewayFeeAmount: split.gatewayFeeAmount,
            creatorEarnings: split.creatorEarnings,
            planSnapshot: split.planSnapshot,
            paymentMethod: "ONLINE",
            paymentId: appt.paymentId || `backfill_appt_${appt.id}`,
            status: "COMPLETED",
            createdAt: appt.createdAt,
          },
        });
      } else {
        await prisma.contentPurchase.create({
          data: {
            organizationId: appt.organizationId,
            userId,
            contentType: "APPOINTMENT",
            appointmentId: appt.id,
            meetingId: appt.meetingId,
            amount: 0,
            currency: boughtCurrency,
            commissionPercent: 0,
            commissionAmount: 0,
            gatewayFeePercent: 0,
            gatewayFeeAmount: 0,
            creatorEarnings: 0,
            planSnapshot: "FREE_CLAIM",
            paymentMethod: "FREE",
            paymentId:
              appt.paymentId || `backfill_free_appt_${appt.id}`,
            status: "COMPLETED",
            createdAt: appt.createdAt,
          },
        });
      }
      created += 1;
    }
  }

  console.log(
    `Done. scanned=${scanned} created=${created} linked=${linked} already-ok=${skipped}`
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
