-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('TABLE', 'ROOM', 'DELIVERY', 'PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerNameSnapshot" TEXT,
ADD COLUMN     "customerNotes" TEXT,
ADD COLUMN     "customerPhoneSnapshot" TEXT,
ADD COLUMN     "deliveryLocation" TEXT,
ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'TABLE';
