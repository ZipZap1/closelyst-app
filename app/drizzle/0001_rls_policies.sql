-- Row-level security for tenant isolation. Each domain table denies access
-- unless `app.tenant_id` is set on the session; the `withTenant()` helper in
-- src/db/client.ts sets that at transaction start.

ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reply_event" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "tenant"
  USING (id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "location"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "staff"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "customer"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "booking"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "reminder"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "waitlist_entry"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON "reply_event"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
