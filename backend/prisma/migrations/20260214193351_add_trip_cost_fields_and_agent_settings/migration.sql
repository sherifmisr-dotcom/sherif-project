-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "default_freight_per_truck" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "default_port_fees_per_truck" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "cost_type" TEXT NOT NULL DEFAULT 'DETAILED',
ADD COLUMN     "freight_per_truck" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "port_fees_per_truck" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "trip_number" TEXT,
ADD COLUMN     "trucks_with_freight" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trucks_without_freight" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "unit_price" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "agent_setting_logs" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freight" DECIMAL(18,6) NOT NULL,
    "port_fees" DECIMAL(18,6) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_setting_logs_pkey" PRIMARY KEY ("id")
);
