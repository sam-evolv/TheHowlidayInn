// TODO HowlidayInn: Updated seed script to use pg client with Settings data
import { db } from "./client";
import { settings } from "./schema";
import { ensureTenant } from "../services/userService";

async function main() {
  const tenantId = await ensureTenant();
  await db.insert(settings).values({
    tenantId,
    id: 1,
    requiredVaccines: [
      { type: "dhpp", label: "Core - DHPP", min_validity_days: 0 },
      { type: "kennel_cough", label: "Kennel Cough", min_validity_days: 0 },
      { type: "leptospirosis", label: "Leptospirosis", min_validity_days: 0 }
    ],
    prohibitedBreeds: [],
    leadTimeHours: 12
  }).onConflictDoNothing();
  console.log("✅ Settings seeded");
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
