import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase-admin.js";

/**
 * Server-side admin authorization.
 *
 * NEVER trust a role string from the request body or query.
 * Role is loaded from admin_profiles using the verified JWT subject.
 *
 * Usage in future /api/admin/* routes:
 *   const admin = await requireAdmin(req, res, ["admin", "support"]);
 *   if (!admin) return; // response already written
 */

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || typeof value !== "string") return "";
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

/**
 * Validate Supabase user JWT and load admin_profiles row.
 * @param {import("@vercel/node").VercelRequest} req
 * @param {string[]} [allowedRoles]
 * @returns {Promise<null | { userId: string, email: string, role: string, displayName: string|null, profile: object }>}
 */
export async function resolveAdminFromRequest(req, allowedRoles = ["admin", "support", "read_only"]) {
  const token = getBearerToken(req);
  if (!token) {
    return { error: { status: 401, message: "Missing Authorization Bearer token." } };
  }

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { error: { status: 500, message: "Supabase auth is not configured on the server." } };
  }

  // User-scoped client: validates JWT without exposing service role to the token path.
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    return { error: { status: 401, message: "Invalid or expired session." } };
  }

  const userId = userData.user.id;
  const email = userData.user.email || "";

  // Load role with service role (bypasses RLS) — still not client-writable.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("admin_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError) {
    return { error: { status: 500, message: "Unable to verify admin profile." } };
  }
  if (!profile) {
    return { error: { status: 403, message: "Not authorized for admin access." } };
  }
  if (!allowedRoles.includes(profile.role)) {
    return { error: { status: 403, message: "Insufficient admin role." } };
  }

  return {
    admin: {
      userId,
      email: profile.email || email,
      role: profile.role,
      displayName: profile.display_name || null,
      profile,
    },
  };
}

/**
 * Express/Vercel-style guard. Writes 401/403 and returns null on failure.
 */
export async function requireAdmin(req, res, allowedRoles = ["admin", "support", "read_only"]) {
  const result = await resolveAdminFromRequest(req, allowedRoles);
  if (result.error) {
    res.status(result.error.status).json({ error: result.error.message });
    return null;
  }
  return result.admin;
}

/**
 * Prevent customers from self-promoting: only service role may insert/update admin_profiles.
 * Call this from any future admin management route; never accept role from untrusted input
 * without verifying the caller is already role=admin.
 */
export async function assertCallerIsAdmin(req, res) {
  return requireAdmin(req, res, ["admin"]);
}
