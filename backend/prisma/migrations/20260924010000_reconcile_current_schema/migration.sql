-- Reconcile database objects that were added to schema.prisma after the
-- original migrations were applied.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KdsStation') THEN
    CREATE TYPE "KdsStation" AS ENUM ('KITCHEN', 'BAR');
  END IF;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WAITER';

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "Customer"
SET "organizationId" = COALESCE(
  (
    SELECT o."organizationId"
    FROM "_CustomerToOrder" co
    JOIN "Order" o ON o."id" = co."B"
    WHERE co."A" = "Customer"."id"
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "organizationId" IS NULL;
ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "waiterId" TEXT;

ALTER TABLE "KdsTicket" ADD COLUMN IF NOT EXISTS "station" "KdsStation";
UPDATE "KdsTicket" SET "station" = 'KITCHEN' WHERE "station" IS NULL;
ALTER TABLE "KdsTicket" ALTER COLUMN "station" SET NOT NULL;

ALTER TABLE "OrderLine" ADD COLUMN IF NOT EXISTS "kdsStation" "KdsStation";

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentMethodId" TEXT;
UPDATE "Payment" p
SET "paymentMethodId" = pm."id"
FROM "Order" o, "PaymentMethod" pm
WHERE p."orderId" = o."id"
  AND pm."organizationId" = o."organizationId"
  AND pm."name"::text = p."paymentMethod"
  AND p."paymentMethodId" IS NULL;
UPDATE "Payment" p
SET "paymentMethodId" = pm."id"
FROM "Order" o
JOIN "PaymentMethod" pm
  ON pm."organizationId" = o."organizationId"
 AND pm."name" = 'CASH'
WHERE p."orderId" = o."id"
  AND p."paymentMethodId" IS NULL;
ALTER TABLE "Payment" ALTER COLUMN "paymentMethodId" SET NOT NULL;
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "paymentMethod";

ALTER TABLE "Product" DROP COLUMN IF EXISTS "showOnKds";
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "kdsStation" "KdsStation";

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_waiterId_fkey"
  FOREIGN KEY ("waiterId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_paymentMethodId_fkey"
  FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "KdsTicket_orderId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "KdsTicket_orderId_station_key" ON "KdsTicket"("orderId", "station");

CREATE INDEX IF NOT EXISTS "Coupon_organizationId_idx" ON "Coupon"("organizationId");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_phone_idx" ON "Customer"("organizationId", "phone");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_email_idx" ON "Customer"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "Floor_organizationId_idx" ON "Floor"("organizationId");
CREATE INDEX IF NOT EXISTS "KdsTicket_station_stage_idx" ON "KdsTicket"("station", "stage");
CREATE INDEX IF NOT EXISTS "KdsTicket_orderId_idx" ON "KdsTicket"("orderId");
CREATE INDEX IF NOT EXISTS "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX IF NOT EXISTS "Order_organizationId_status_idx" ON "Order"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Order_organizationId_tableId_idx" ON "Order"("organizationId", "tableId");
CREATE INDEX IF NOT EXISTS "Order_organizationId_waiterId_idx" ON "Order"("organizationId", "waiterId");
CREATE INDEX IF NOT EXISTS "Order_sessionId_idx" ON "Order"("sessionId");
CREATE INDEX IF NOT EXISTS "OrderLine_orderId_idx" ON "OrderLine"("orderId");
CREATE INDEX IF NOT EXISTS "OrderLine_productId_idx" ON "OrderLine"("productId");
CREATE INDEX IF NOT EXISTS "OrderLine_orderId_kdsStation_idx" ON "OrderLine"("orderId", "kdsStation");
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "Payment_paymentMethodId_idx" ON "Payment"("paymentMethodId");
CREATE INDEX IF NOT EXISTS "PaymentMethod_organizationId_idx" ON "PaymentMethod"("organizationId");
CREATE INDEX IF NOT EXISTS "PosSession_organizationId_idx" ON "PosSession"("organizationId");
CREATE INDEX IF NOT EXISTS "PosSession_organizationId_status_idx" ON "PosSession"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Product_organizationId_idx" ON "Product"("organizationId");
CREATE INDEX IF NOT EXISTS "Product_organizationId_categoryId_idx" ON "Product"("organizationId", "categoryId");
CREATE INDEX IF NOT EXISTS "Product_organizationId_kdsStation_idx" ON "Product"("organizationId", "kdsStation");
CREATE INDEX IF NOT EXISTS "ProductCategory_organizationId_idx" ON "ProductCategory"("organizationId");
CREATE INDEX IF NOT EXISTS "Promotion_organizationId_idx" ON "Promotion"("organizationId");
CREATE INDEX IF NOT EXISTS "Promotion_organizationId_productId_idx" ON "Promotion"("organizationId", "productId");
CREATE INDEX IF NOT EXISTS "Table_organizationId_idx" ON "Table"("organizationId");
CREATE INDEX IF NOT EXISTS "Table_organizationId_floorId_idx" ON "Table"("organizationId", "floorId");
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "User_organizationId_role_idx" ON "User"("organizationId", "role");
