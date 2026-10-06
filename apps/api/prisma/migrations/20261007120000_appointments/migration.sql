-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentOrigin" AS ENUM ('DIGITIZER', 'SYSTEM');

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "scheduled_on" DATE NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "origin" "AppointmentOrigin" NOT NULL,
    "note" VARCHAR(200),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by_id" UUID,
    "closed_at" TIMESTAMPTZ(3),
    "cancel_reason" VARCHAR(200),
    "reminder_sent_at" TIMESTAMPTZ(3),
    "same_day_reminder_sent_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_facility_id_scheduled_on_idx" ON "appointments"("facility_id", "scheduled_on");

-- CreateIndex
CREATE INDEX "appointments_child_id_status_idx" ON "appointments"("child_id", "status");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_closure_consistency" CHECK (("status" = 'SCHEDULED') = ("closed_at" IS NULL)),
  ADD CONSTRAINT "appointments_cancel_reason" CHECK ("status" <> 'CANCELLED' OR "cancel_reason" IS NOT NULL),
  ADD CONSTRAINT "appointments_version_positive" CHECK ("version" >= 1);

CREATE UNIQUE INDEX "appointments_one_scheduled_per_type" ON "appointments" ("child_id", "type") WHERE "status" = 'SCHEDULED';

