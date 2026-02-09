import argon2 from "argon2";
import { getOwner, upsertOwner, ensureTenant } from "../services/userService";

export async function ensureOwnerExists() {
  const existing = await getOwner();
  if (existing && existing.passwordHash) {
    // Owner already exists with password
    return;
  }

  const email = process.env.OWNER_EMAIL?.trim();
  const name = process.env.OWNER_NAME?.trim() || "Owner";
  const tempPass = process.env.OWNER_PASSWORD?.trim();

  if (!email || !tempPass) {
    console.warn("[auth] No owner present and OWNER_EMAIL/OWNER_PASSWORD not set. Admin will be locked.");
    return;
  }

  // Ensure tenant exists and get tenant_id
  const tenantId = await ensureTenant();

  const hash = await argon2.hash(tempPass, { type: argon2.argon2id });
  await upsertOwner({
    tenantId,
    id: "owner",
    email,
    name,
    role: "owner",
    passwordHash: hash,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
  console.log("[auth] Bootstrapped owner account:", email);
}
