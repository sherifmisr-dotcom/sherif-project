-- CreateTable
CREATE TABLE "carry_forward_settings" (
    "id" TEXT NOT NULL DEFAULT 'single_row',
    "auto_carry_forward_enabled" BOOLEAN NOT NULL DEFAULT false,
    "carry_forward_day" INTEGER NOT NULL DEFAULT 1,
    "carry_forward_type" TEXT NOT NULL DEFAULT 'MONTH',
    "notify_before_carry_forward" BOOLEAN NOT NULL DEFAULT true,
    "notify_days_before" INTEGER NOT NULL DEFAULT 3,
    "last_auto_carry_forward" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carry_forward_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carry_forward_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity_id" TEXT,
    "execution_type" TEXT NOT NULL,
    "executed_by" TEXT,
    "period_type" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "balance_amount" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carry_forward_logs_pkey" PRIMARY KEY ("id")
);
