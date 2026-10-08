#!/usr/bin/env node
/**
 * Secure designer provisioning (Firebase Admin SDK). There is NO public registration.
 *
 *   npm run designer:create -- --email a@b.com --name "Asha" [--role designer|admin]
 *   npm run designer:create -- --email a@b.com --deactivate
 *
 * Reads FIREBASE_ADMIN_* values from .env.local. The script never prints or stores a password:
 * it prints a one-time password-setup link that you send to the designer.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const args = process.argv.slice(2);
const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const has = (f) => args.includes(f);

const email = get("--email")?.trim().toLowerCase();
const name = get("--name")?.trim();
const role = get("--role") ?? "designer";
if (!email || !/^\S+@\S+\.\S+$/.test(email)) { console.error("Provide a valid --email"); process.exit(1); }
if (!["designer", "admin"].includes(role)) { console.error("--role must be designer or admin"); process.exit(1); }

const { FIREBASE_ADMIN_PROJECT_ID: projectId, FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail, FIREBASE_DATABASE_URL: databaseURL } = process.env;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey || !databaseURL) { console.error("Missing FIREBASE_ADMIN_* variables in .env.local"); process.exit(1); }

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
const auth = getAuth();
const db = getDatabase();

let user;
try { user = await auth.getUserByEmail(email); } catch { user = null; }

if (has("--deactivate")) {
  if (!user) { console.error("No such user"); process.exit(1); }
  await db.ref(`designerProfiles/${user.uid}/active`).set(false);
  await auth.updateUser(user.uid, { disabled: true });
  await auth.revokeRefreshTokens(user.uid);
  console.log(`Deactivated ${email}`);
  process.exit(0);
}

if (!name) { console.error("Provide --name"); process.exit(1); }
if (!user) user = await auth.createUser({ email, displayName: name, emailVerified: false });
else await auth.updateUser(user.uid, { displayName: name, disabled: false });

await db.ref(`designerProfiles/${user.uid}`).set({ displayName: name, email, role, active: true });
await db.ref(`designerDirectory/${user.uid}`).set({ displayName: name });

const link = await auth.generatePasswordResetLink(email);
console.log(`\nDesigner ready: ${name} <${email}> role=${role} uid=${user.uid}`);
console.log("Send this one-time link so they can set their own password:\n");
console.log(link, "\n");
