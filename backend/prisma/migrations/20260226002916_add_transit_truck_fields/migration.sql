-- AlterTable
ALTER TABLE "agent_setting_logs" ADD COLUMN     "transit_port_fees" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "default_transit_port_fees" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "transit_port_fees_per_truck" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "transit_trucks_with_freight" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transit_trucks_without_freight" INTEGER NOT NULL DEFAULT 0;
