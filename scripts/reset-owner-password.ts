import argon2 from "argon2";
import { db } from "../server/db/client";
import { users } from "../server/db/schema";
import { eq } from "drizzle-orm";

async function resetOwnerPassword() {
  const email = process.env.OWNER_EMAIL?.trim();
  const password = process.env.OWNER_PASSWORD?.trim();

  if (!email || !password) {
    console.error("❌ OWNER_EMAIL and OWNER_PASSWORD environment variables are required");
    process.exit(1);
  }

  console.log(`🔄 Resetting password for owner: ${email}`);
  
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  
  const result = await db
    .update(users)
    .set({ 
      passwordHash: hash,
      updatedAt: new Date()
    })
    .where(eq(users.role, 'owner'))
    .returning();

  if (result.length === 0) {
    console.error("❌ No owner account found in database");
    process.exit(1);
  }

  console.log(`✅ Password reset successfully for: ${result[0].email}`);
  console.log(`   You can now log in with the password from OWNER_PASSWORD`);
  process.exit(0);
}

resetOwnerPassword().catch((err) => {
  console.error("❌ Error resetting password:", err);
  process.exit(1);
});
