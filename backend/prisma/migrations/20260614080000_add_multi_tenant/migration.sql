-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Create default organization
INSERT INTO "Organization" (id, name, "createdAt")
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Cafe', NOW())
ON CONFLICT DO NOTHING;

-- DropIndex
DROP INDEX IF EXISTS "Coupon_code_key";

-- DropIndex
DROP INDEX IF EXISTS "Order_orderNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "PaymentMethod_name_key";

-- DropIndex
DROP INDEX IF EXISTS "ProductCategory_name_key";

-- AlterTable (Add organizationId as nullable first)
ALTER TABLE "Coupon" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Customer" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Floor" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Order" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "PaymentMethod" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "PosSession" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Product" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Promotion" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "Table" ADD COLUMN     "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN     "organizationId" TEXT;

-- Update existing records to refer to the default organization
UPDATE "Coupon" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Customer" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Floor" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Order" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "PaymentMethod" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "PosSession" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Product" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "ProductCategory" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Promotion" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "Table" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;
UPDATE "User" SET "organizationId" = '00000000-0000-0000-0000-000000000000' WHERE "organizationId" IS NULL;

-- AlterTable (Set organizationId as NOT NULL)
ALTER TABLE "Coupon" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Floor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PaymentMethod" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PosSession" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ProductCategory" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Promotion" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Table" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_organizationId_code_key" ON "Coupon"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Order_organizationId_orderNumber_key" ON "Order"("organizationId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_organizationId_name_key" ON "PaymentMethod"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_organizationId_name_key" ON "ProductCategory"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
