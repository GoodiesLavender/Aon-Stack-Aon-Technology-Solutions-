/**
 * Security self-test helpers (run via node against local API or unit-level).
 * Does not mutate payment data. Safe to run in CI/dev.
 */
import { createAgreementAccessToken, tokensMatch } from "./tokens.js";

export function runTokenSecurityUnitTests() {
  const results = [];

  const a = createAgreementAccessToken();
  const b = createAgreementAccessToken();
  results.push({
    name: "tokens are high-entropy and unique",
    pass: typeof a === "string" && a.length >= 32 && a !== b,
  });

  results.push({
    name: "tokensMatch accepts identical token",
    pass: tokensMatch(a, a) === true,
  });

  results.push({
    name: "tokensMatch rejects different token",
    pass: tokensMatch(a, b) === false,
  });

  results.push({
    name: "tokensMatch rejects empty",
    pass: tokensMatch("", a) === false && tokensMatch(a, "") === false && tokensMatch(null, a) === false,
  });

  results.push({
    name: "tokensMatch rejects length mismatch without throw",
    pass: tokensMatch(a, a.slice(0, 8)) === false,
  });

  return results;
}

export function simulateRlsMatrix() {
  /**
   * Logical matrix documenting expected outcomes after policies are pushed.
   * This is not a live DB test — live tests require Supabase Auth users + Push.
   */
  const cases = [
    {
      actor: "anon",
      table: "orders",
      op: "SELECT",
      expected: "deny",
      reason: "no anon policy on orders",
    },
    {
      actor: "authenticated customer A (auth_user_id=A)",
      table: "orders where auth_user_id=A",
      op: "SELECT",
      expected: "allow",
      reason: "orders_select_own",
    },
    {
      actor: "authenticated customer A",
      table: "orders where auth_user_id=B",
      op: "SELECT",
      expected: "deny",
      reason: "auth_user_id mismatch",
    },
    {
      actor: "authenticated customer A",
      table: "orders",
      op: "UPDATE",
      expected: "deny",
      reason: "no customer update policy",
    },
    {
      actor: "authenticated customer A",
      table: "admin_profiles",
      op: "INSERT role=admin",
      expected: "deny",
      reason: "no insert policy on admin_profiles",
    },
    {
      actor: "authenticated customer A",
      table: "admin_profiles where user_id=A",
      op: "UPDATE role",
      expected: "deny",
      reason: "no update policy — cannot self-promote",
    },
    {
      actor: "staff admin (admin_profiles.role=admin)",
      table: "orders",
      op: "SELECT",
      expected: "allow",
      reason: "orders_select_staff via is_staff()",
    },
    {
      actor: "staff support",
      table: "internal_notes",
      op: "SELECT",
      expected: "allow",
      reason: "internal_notes_select_staff",
    },
    {
      actor: "customer A",
      table: "internal_notes",
      op: "SELECT",
      expected: "deny",
      reason: "no customer policy on internal_notes",
    },
    {
      actor: "anon GET /api/legal/agreements/:id without token",
      table: "API",
      op: "GET",
      expected: "401",
      reason: "IDOR fix requires access_token",
    },
    {
      actor: "anon GET with wrong token",
      table: "API",
      op: "GET",
      expected: "401",
      reason: "timing-safe token compare fails",
    },
    {
      actor: "holder of correct access_token",
      table: "API",
      op: "GET",
      expected: "200",
      reason: "capability token matches",
    },
    {
      actor: "service_role (api/*)",
      table: "all",
      op: "ALL",
      expected: "allow",
      reason: "service_role bypasses RLS — server must enforce authz",
    },
  ];
  return cases;
}
