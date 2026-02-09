// HowlidayInn: promote first ADMIN_EMAILS to admin
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const email = process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "sam@evolvai.ie";

(async () => {
  const result = await db.update(users).set({ role: "admin" }).where(eq(users.email, email))
    .returning({ id: users.id, email: users.email, role: users.role });
  if (result.length === 0) {
    console.log(`No user for ${email}. Log in once via the app to create it, then rerun.`);
  } else {
    console.log("✅ Promoted:", result[0]);
  }
})().catch(e => { console.error(e); process.exit(1); });