// HowlidayInn: auth bootstrap
import { Router } from "express";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { admin } from "../firebase-admin";
export const authBootstrap = Router();
function requireFirebaseUser() {
    return async (req, res, next) => {
        try {
            const hdr = req.headers.authorization || "";
            const alt = req.headers["x-id-token"] || "";
            const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : alt;
            if (!token) {
                console.error("bootstrap: missing token");
                return res.status(401).json({ error: "Missing token" });
            }
            const decoded = await admin.auth().verifyIdToken(token);
            if (!decoded?.email) {
                console.error("bootstrap: token has no email", decoded?.uid);
                return res.status(400).json({ error: "No email on token" });
            }
            req.authUser = { email: decoded.email };
            next();
        }
        catch (e) {
            console.error("bootstrap: verifyIdToken failed", e?.message || e);
            return res.status(401).json({ error: "Invalid token", detail: e?.message });
        }
    };
}
authBootstrap.post("/api/auth/bootstrap", requireFirebaseUser(), async (req, res) => {
    try {
        // Get user info from middleware (avoid redundant token verification)
        const hdr = req.headers.authorization || "";
        const alt = req.headers["x-id-token"] || "";
        const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : alt;
        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;
        const email = decoded.email;
        const displayName = decoded.name || decoded.display_name || null;
        console.log("bootstrap: decoded token", { uid, email, name: decoded.name, display_name: decoded.display_name, displayName });
        // Idempotent insert - create user if not exists, update name if changed
        await db.insert(users).values({
            id: uid, // Use Firebase UID as user ID
            email,
            name: displayName,
            role: "user",
        }).onConflictDoUpdate({
            target: users.id,
            set: {
                name: displayName, // Update name if Firebase has it and DB doesn't
                email, // Update email in case it changed
            }
        });
        // Fetch user (will exist now)
        const user = await db.select().from(users).where(eq(users.id, uid));
        console.log("bootstrap: user record confirmed", { uid, email });
        res.json({ ok: true, user: user[0] });
    }
    catch (error) {
        console.error("bootstrap: error creating user", error);
        res.status(500).json({ error: "Failed to bootstrap user" });
    }
});
