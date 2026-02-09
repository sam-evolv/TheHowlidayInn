import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
export async function getOwner() {
    const result = await db.select().from(users).where(eq(users.role, 'owner')).limit(1);
    if (result.length === 0)
        return null;
    return result[0];
}
export async function upsertOwner(data) {
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
        return updated[0];
    }
    else {
        // Insert new owner
        const inserted = await db
            .insert(users)
            .values({
            id: data.id || 'owner',
            email: data.email,
            name: data.name || null,
            role: 'owner',
            passwordHash: data.passwordHash || null,
            createdAt: new Date(),
            updatedAt: new Date()
        })
            .returning();
        return inserted[0];
    }
}
