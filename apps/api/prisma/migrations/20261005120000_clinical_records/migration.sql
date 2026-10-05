-- CreateEnum
CREATE TYPE "MeasurementPosition" AS ENUM ('LYING', 'STANDING');

-- CreateEnum
CREATE TYPE "AnemiaClass" AS ENUM ('NONE', 'MILD', 'MODERATE', 'SEVERE', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "IronProduct" AS ENUM ('DROPS', 'SYRUP', 'MICRONUTRIENTS', 'TABLETS');

-- CreateEnum
CREATE TYPE "IronPurpose" AS ENUM ('PREVENTION', 'TREATMENT');

-- CreateEnum
CREATE TYPE "ClinicalRecordType" AS ENUM ('DOSE', 'GROWTH_CHECK', 'HEMOGLOBIN_TEST', 'IRON_SUPPLY');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "hemoglobin_altitude_adjustments" (
    "id" UUID NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "min_altitude" INTEGER NOT NULL,
    "max_altitude" INTEGER NOT NULL,
    "subtract" DECIMAL(3,1) NOT NULL,

    CONSTRAINT "hemoglobin_altitude_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administered_doses" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "scheduled_dose_id" UUID NOT NULL,
    "vaccine_id" UUID NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "administered_on" DATE NOT NULL,
    "lot" VARCHAR(40) NOT NULL,
    "out_of_range_reason" VARCHAR(300),
    "facility_id" UUID NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "replaces_id" UUID,
    "correction_reason" VARCHAR(300),

    CONSTRAINT "administered_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_checks" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "measured_on" DATE NOT NULL,
    "weight_kg" DECIMAL(5,3) NOT NULL,
    "length_cm" DECIMAL(4,1) NOT NULL,
    "position" "MeasurementPosition" NOT NULL,
    "head_circumference_cm" DECIMAL(4,1),
    "age_days" INTEGER NOT NULL,
    "corrected_age_days" INTEGER NOT NULL,
    "z_weight_for_age" DECIMAL(4,2),
    "z_length_for_age" DECIMAL(4,2),
    "z_weight_for_length" DECIMAL(4,2),
    "z_head_for_age" DECIMAL(4,2),
    "weight_for_age" VARCHAR(24),
    "length_for_age" VARCHAR(24),
    "weight_for_length" VARCHAR(24),
    "head_for_age" VARCHAR(24),
    "reference_version" VARCHAR(16) NOT NULL,
    "facility_id" UUID NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "replaces_id" UUID,
    "correction_reason" VARCHAR(300),

    CONSTRAINT "growth_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hemoglobin_tests" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "tested_on" DATE NOT NULL,
    "observed" DECIMAL(4,1) NOT NULL,
    "altitude_meters" INTEGER NOT NULL,
    "adjustment" DECIMAL(3,1) NOT NULL,
    "adjusted" DECIMAL(4,1) NOT NULL,
    "age_months" INTEGER NOT NULL,
    "classification" "AnemiaClass" NOT NULL,
    "threshold_version_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "replaces_id" UUID,
    "correction_reason" VARCHAR(300),

    CONSTRAINT "hemoglobin_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iron_supplies" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "supplied_on" DATE NOT NULL,
    "product" "IronProduct" NOT NULL,
    "dose_instructions" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purpose" "IronPurpose" NOT NULL,
    "facility_id" UUID NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "replaces_id" UUID,
    "correction_reason" VARCHAR(300),

    CONSTRAINT "iron_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_requests" (
    "id" UUID NOT NULL,
    "record_type" "ClinicalRecordType" NOT NULL,
    "record_id" UUID NOT NULL,
    "proposed" JSONB NOT NULL,
    "reason" VARCHAR(300) NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "rejection_reason" VARCHAR(300),

    CONSTRAINT "correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hemoglobin_altitude_adjustments_catalog_version_id_min_alti_key" ON "hemoglobin_altitude_adjustments"("catalog_version_id", "min_altitude");

-- CreateIndex
CREATE UNIQUE INDEX "administered_doses_replaces_id_key" ON "administered_doses"("replaces_id");

-- CreateIndex
CREATE INDEX "administered_doses_child_id_idx" ON "administered_doses"("child_id");

-- CreateIndex
CREATE UNIQUE INDEX "growth_checks_replaces_id_key" ON "growth_checks"("replaces_id");

-- CreateIndex
CREATE INDEX "growth_checks_child_id_measured_on_idx" ON "growth_checks"("child_id", "measured_on");

-- CreateIndex
CREATE UNIQUE INDEX "hemoglobin_tests_replaces_id_key" ON "hemoglobin_tests"("replaces_id");

-- CreateIndex
CREATE INDEX "hemoglobin_tests_child_id_tested_on_idx" ON "hemoglobin_tests"("child_id", "tested_on");

-- CreateIndex
CREATE UNIQUE INDEX "iron_supplies_replaces_id_key" ON "iron_supplies"("replaces_id");

-- CreateIndex
CREATE INDEX "iron_supplies_child_id_supplied_on_idx" ON "iron_supplies"("child_id", "supplied_on");

-- CreateIndex
CREATE INDEX "correction_requests_status_requested_at_idx" ON "correction_requests"("status", "requested_at");

-- AddForeignKey
ALTER TABLE "hemoglobin_altitude_adjustments" ADD CONSTRAINT "hemoglobin_altitude_adjustments_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administered_doses" ADD CONSTRAINT "administered_doses_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administered_doses" ADD CONSTRAINT "administered_doses_scheduled_dose_id_fkey" FOREIGN KEY ("scheduled_dose_id") REFERENCES "scheduled_doses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administered_doses" ADD CONSTRAINT "administered_doses_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administered_doses" ADD CONSTRAINT "administered_doses_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administered_doses" ADD CONSTRAINT "administered_doses_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administered_doses" ADD CONSTRAINT "administered_doses_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "administered_doses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_checks" ADD CONSTRAINT "growth_checks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_checks" ADD CONSTRAINT "growth_checks_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_checks" ADD CONSTRAINT "growth_checks_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_checks" ADD CONSTRAINT "growth_checks_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "growth_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hemoglobin_tests" ADD CONSTRAINT "hemoglobin_tests_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hemoglobin_tests" ADD CONSTRAINT "hemoglobin_tests_threshold_version_id_fkey" FOREIGN KEY ("threshold_version_id") REFERENCES "catalog_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hemoglobin_tests" ADD CONSTRAINT "hemoglobin_tests_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hemoglobin_tests" ADD CONSTRAINT "hemoglobin_tests_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hemoglobin_tests" ADD CONSTRAINT "hemoglobin_tests_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "hemoglobin_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iron_supplies" ADD CONSTRAINT "iron_supplies_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iron_supplies" ADD CONSTRAINT "iron_supplies_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iron_supplies" ADD CONSTRAINT "iron_supplies_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iron_supplies" ADD CONSTRAINT "iron_supplies_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "iron_supplies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hemoglobin_altitude_adjustments"
  ADD CONSTRAINT "hemoglobin_altitude_adjustments_range" CHECK ("min_altitude" >= 0 AND "max_altitude" >= "min_altitude" AND "max_altitude" <= 6000),
  ADD CONSTRAINT "hemoglobin_altitude_adjustments_subtract" CHECK ("subtract" >= 0 AND "subtract" <= 6);

CREATE TRIGGER "hemoglobin_altitude_adjustments_only_in_drafts"
  BEFORE INSERT OR UPDATE OR DELETE ON "hemoglobin_altitude_adjustments"
  FOR EACH ROW EXECUTE FUNCTION "catalog_entries_only_in_drafts"();

ALTER TABLE "administered_doses"
  ADD CONSTRAINT "administered_doses_dose_number" CHECK ("dose_number" BETWEEN 1 AND 10),
  ADD CONSTRAINT "administered_doses_lot_present" CHECK (length(trim("lot")) >= 1),
  ADD CONSTRAINT "administered_doses_correction_consistency" CHECK (("replaces_id" IS NULL) = ("correction_reason" IS NULL)),
  ADD CONSTRAINT "administered_doses_version_positive" CHECK ("version" >= 1);

CREATE UNIQUE INDEX "administered_doses_one_current" ON "administered_doses" ("child_id", "vaccine_id", "dose_number") WHERE "is_current";

ALTER TABLE "growth_checks"
  ADD CONSTRAINT "growth_checks_weight_range" CHECK ("weight_kg" BETWEEN 0.3 AND 40),
  ADD CONSTRAINT "growth_checks_length_range" CHECK ("length_cm" BETWEEN 30 AND 130),
  ADD CONSTRAINT "growth_checks_head_range" CHECK ("head_circumference_cm" IS NULL OR "head_circumference_cm" BETWEEN 18 AND 60),
  ADD CONSTRAINT "growth_checks_ages" CHECK ("age_days" >= 0 AND "corrected_age_days" >= 0 AND "corrected_age_days" <= "age_days"),
  ADD CONSTRAINT "growth_checks_correction_consistency" CHECK (("replaces_id" IS NULL) = ("correction_reason" IS NULL)),
  ADD CONSTRAINT "growth_checks_version_positive" CHECK ("version" >= 1);

ALTER TABLE "hemoglobin_tests"
  ADD CONSTRAINT "hemoglobin_tests_observed_range" CHECK ("observed" BETWEEN 3 AND 25),
  ADD CONSTRAINT "hemoglobin_tests_adjustment_range" CHECK ("adjustment" >= 0 AND "adjusted" = "observed" - "adjustment"),
  ADD CONSTRAINT "hemoglobin_tests_altitude_range" CHECK ("altitude_meters" BETWEEN 0 AND 5000),
  ADD CONSTRAINT "hemoglobin_tests_age_months" CHECK ("age_months" >= 0),
  ADD CONSTRAINT "hemoglobin_tests_correction_consistency" CHECK (("replaces_id" IS NULL) = ("correction_reason" IS NULL)),
  ADD CONSTRAINT "hemoglobin_tests_version_positive" CHECK ("version" >= 1);

ALTER TABLE "iron_supplies"
  ADD CONSTRAINT "iron_supplies_quantity_range" CHECK ("quantity" BETWEEN 1 AND 100),
  ADD CONSTRAINT "iron_supplies_instructions_present" CHECK (length(trim("dose_instructions")) >= 1),
  ADD CONSTRAINT "iron_supplies_correction_consistency" CHECK (("replaces_id" IS NULL) = ("correction_reason" IS NULL)),
  ADD CONSTRAINT "iron_supplies_version_positive" CHECK ("version" >= 1);

ALTER TABLE "correction_requests"
  ADD CONSTRAINT "correction_requests_resolution_consistency" CHECK (
    ("status" = 'REQUESTED') = ("resolved_by_id" IS NULL AND "resolved_at" IS NULL)
  ),
  ADD CONSTRAINT "correction_requests_rejection_reason" CHECK ("status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL);

CREATE UNIQUE INDEX "correction_requests_one_open" ON "correction_requests" ("record_type", "record_id") WHERE "status" = 'REQUESTED';

