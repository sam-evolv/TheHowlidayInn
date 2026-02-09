import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import argon2 from "argon2";
import { z } from "zod";
import { getOwner, upsertOwner } from "../services/userService";
import { setSessionCookie, clearSessionCookie, requireOwnerAuth, getAuth } from "../auth/session";
export const authRouter = express.Router();
authRouter.use(cookieParser());
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
authRouter.use("/login", limiter);
authRouter.get("/me", async (req, res) => {
    const session = getAuth(req);
    if (!session)
        return res.status(401).json({ user: null });
    return res.json({ user: session });
});
authRouter.post("/login", async (req, res) => {
    try {
        const body = z.object({
            email: z.string().email(),
            password: z.string().min(8),
        }).parse(req.body);
        const owner = await getOwner();
        if (!owner || owner.email.toLowerCase() !== body.email.toLowerCase()) {
            return res.status(401).json({ error: "invalid_credentials" });
        }
        if (!owner.passwordHash) {
            return res.status(401).json({ error: "invalid_credentials" });
        }
        const ok = await argon2.verify(owner.passwordHash, body.password);
        if (!ok)
            return res.status(401).json({ error: "invalid_credentials" });
        setSessionCookie(res, { id: owner.id, email: owner.email, name: owner.name, role: "owner" });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error("[auth] Login error:", error);
        return res.status(400).json({ error: "invalid_request" });
    }
});
authRouter.post("/logout", (req, res) => {
    clearSessionCookie(res);
    return res.json({ ok: true });
});
authRouter.post("/change-password", requireOwnerAuth, async (req, res) => {
    try {
        const body = z.object({
            currentPassword: z.string().min(8),
            newPassword: z.string().min(12),
        }).parse(req.body);
        const owner = await getOwner();
        if (!owner)
            return res.status(400).json({ error: "no_owner" });
        if (!owner.passwordHash) {
            return res.status(400).json({ error: "no_password_set" });
        }
        const ok = await argon2.verify(owner.passwordHash, body.currentPassword);
        if (!ok)
            return res.status(401).json({ error: "invalid_current_password" });
        const newHash = await argon2.hash(body.newPassword, { type: argon2.argon2id });
        await upsertOwner({ ...owner, passwordHash: newHash, updatedAt: new Date() });
        return res.json({ ok: true });
    }
    catch (error) {
        console.error("[auth] Change password error:", error);
        return res.status(400).json({ error: "invalid_request" });
    }
});
