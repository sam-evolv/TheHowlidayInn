import { db } from "../db/client";
import { users, tenants } from "../db/schema";
import { eq } from "drizzle-orm";

export interface OwnerUser {
  tenantId: string;
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  role: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export async function getOwner(): Promise<OwnerUser | null> {
  const result = await db.select().from(users).where(eq(users.role, 'owner')).limit(1);
  if (result.length === 0) return null;
  return result[0] as OwnerUser;
}

export async function ensureTenant(): Promise<string> {
  // Check if a tenant exists for The Howliday Inn
  const existingTenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'howliday-inn'))
    .limit(1);
  
  if (existingTenant.length > 0) {
    return existingTenant[0].id;
  }
  
  // Create default tenant for The Howliday Inn
  const newTenant = await db
    .insert(tenants)
    .values({
      slug: 'howliday-inn',
      name: 'The Howliday Inn',
      vertical: 'pet-boarding',
      timezone: 'Europe/Dublin',
      currency: 'EUR',
      status: 'active'
    })
    .returning();
  
  return newTenant[0].id;
}

export async function upsertOwner(data: Partial<OwnerUser>): Promise<OwnerUser> {
  const existing = await getOwner();
  
  if (existing) {
    // Update existing owner
    const updated = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated[0] as OwnerUser;
  } else {
    // Ensure we have a tenant_id
    if (!data.tenantId) {
      throw new Error('tenant_id is required when creating a new owner');
    }
    
    // Insert new owner
    const inserted = await db
      .insert(users)
      .values({
        tenantId: data.tenantId,
        id: data.id || 'owner',
        email: data.email!,
        name: data.name || null,
        role: 'owner',
        passwordHash: data.passwordHash || null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)
      .returning();
    return inserted[0] as OwnerUser;
  }
}
