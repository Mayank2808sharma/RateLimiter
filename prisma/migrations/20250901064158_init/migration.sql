-- CreateEnum
CREATE TYPE "WindowType" AS ENUM ('MINUTE', 'DAY');

-- CreateTable
CREATE TABLE "API_Keys" (
    "id" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 1000,
    "daily_quota" INTEGER NOT NULL DEFAULT 100000,
    "burst_per_minute" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "API_Keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate_Limit_Windows" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "requests_count" INTEGER NOT NULL,
    "window_type" "WindowType" NOT NULL,

    CONSTRAINT "Rate_Limit_Windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request_Logs" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "was_allowed" BOOLEAN NOT NULL,

    CONSTRAINT "Request_Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocked_IPs" (
    "id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "blocked_until" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blocked_IPs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endpoint_Limits" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "rate_limit_per_minute" INTEGER,
    "daily_quota" INTEGER,
    "burst" INTEGER,

    CONSTRAINT "Endpoint_Limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "API_Keys_key_value_key" ON "API_Keys"("key_value");

-- CreateIndex
CREATE INDEX "Rate_Limit_Windows_api_key_id_window_type_window_start_idx" ON "Rate_Limit_Windows"("api_key_id", "window_type", "window_start");

-- CreateIndex
CREATE UNIQUE INDEX "Rate_Limit_Windows_api_key_id_window_start_window_type_key" ON "Rate_Limit_Windows"("api_key_id", "window_start", "window_type");

-- CreateIndex
CREATE INDEX "Request_Logs_api_key_id_timestamp_idx" ON "Request_Logs"("api_key_id", "timestamp");

-- CreateIndex
CREATE INDEX "Request_Logs_ip_address_timestamp_idx" ON "Request_Logs"("ip_address", "timestamp");

-- CreateIndex
CREATE INDEX "Request_Logs_was_allowed_timestamp_idx" ON "Request_Logs"("was_allowed", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Blocked_IPs_ip_address_key" ON "Blocked_IPs"("ip_address");

-- CreateIndex
CREATE INDEX "Blocked_IPs_blocked_until_idx" ON "Blocked_IPs"("blocked_until");

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_Limits_api_key_id_endpoint_key" ON "Endpoint_Limits"("api_key_id", "endpoint");

-- AddForeignKey
ALTER TABLE "Rate_Limit_Windows" ADD CONSTRAINT "Rate_Limit_Windows_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "API_Keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request_Logs" ADD CONSTRAINT "Request_Logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "API_Keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endpoint_Limits" ADD CONSTRAINT "Endpoint_Limits_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "API_Keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
