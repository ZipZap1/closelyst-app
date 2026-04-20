import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * Integration test for the RLS + withTenant() isolation contract.
 *
 * Runs only when DATABASE_URL is set and the 0000/0001/0002 migrations have
 * been applied. Verifies that:
 *   1. Tenant A's SELECT does not see Tenant B's rows even without filtering.
 *   2. Missing `app.tenant_id` GUC returns zero rows (policy denies).
 *
 * We hit the `tenant_onboarding` table specifically, since it is a table this
 * tranche introduces.
 */
describeIf("withTenant RLS isolation", () => {
  it("isolates tenant_onboarding reads across tenants", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantA]);
      await client.query(
        "INSERT INTO tenant (id, name, billing_email) VALUES ($1, 'A', 'a@test.de')",
        [tenantA]
      );
      await client.query("INSERT INTO tenant_onboarding (tenant_id) VALUES ($1)", [tenantA]);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantB]);
      await client.query(
        "INSERT INTO tenant (id, name, billing_email) VALUES ($1, 'B', 'b@test.de')",
        [tenantB]
      );
      await client.query("INSERT INTO tenant_onboarding (tenant_id) VALUES ($1)", [tenantB]);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantA]);
      const seenFromA = await client.query("SELECT tenant_id FROM tenant_onboarding");
      expect(seenFromA.rows.every((r) => r.tenant_id === tenantA)).toBe(true);
      await client.query("COMMIT");

      await client.query("BEGIN");
      const unscoped = await client.query("SELECT count(*)::int as c FROM tenant_onboarding");
      expect(unscoped.rows[0]?.c).toBe(0);
      await client.query("COMMIT");
    } finally {
      await client.query("BEGIN");
      await client.query("SET LOCAL row_security = off");
      await client.query("DELETE FROM tenant WHERE id IN ($1, $2)", [tenantA, tenantB]);
      await client.query("COMMIT");
      client.release();
      await pool.end();
    }
  });
});
