-- Prevent concurrent requests from opening multiple POS sessions for one organization.
CREATE UNIQUE INDEX IF NOT EXISTS "PosSession_one_open_per_org_idx"
ON "PosSession" ("organizationId")
WHERE "status" = 'OPEN';
