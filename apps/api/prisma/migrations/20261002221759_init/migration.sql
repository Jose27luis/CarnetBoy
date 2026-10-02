-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DIGITIZER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CatalogKind" AS ENUM ('VACCINATION_SCHEDULE', 'HEMOGLOBIN_THRESHOLDS', 'APPOINTMENT_INTERVALS');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('GROWTH_CHECK', 'VACCINATION', 'HEMOGLOBIN_TEST');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "role" "Role" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_hash" VARCHAR(255) NOT NULL,
    "password_change_required" BOOLEAN NOT NULL DEFAULT true,
    "totp_secret_encrypted" VARCHAR(255),
    "totp_enabled_at" TIMESTAMPTZ(3),
    "totp_last_time_step" INTEGER,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "ipress_code" CHAR(8) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "health_network" VARCHAR(120) NOT NULL,
    "altitude_meters" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_assignments" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "granted_by_id" UUID NOT NULL,
    "ended_by_id" UUID,

    CONSTRAINT "facility_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "prevents" VARCHAR(240) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_versions" (
    "id" UUID NOT NULL,
    "kind" "CatalogKind" NOT NULL,
    "norm" VARCHAR(240) NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "valid_from" DATE,
    "valid_to" DATE,
    "published_at" TIMESTAMPTZ(3),
    "created_by_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalog_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_doses" (
    "id" UUID NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "vaccine_id" UUID NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "recommended_age_days" INTEGER NOT NULL,
    "max_age_days" INTEGER NOT NULL,

    CONSTRAINT "scheduled_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hemoglobin_thresholds" (
    "id" UUID NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "min_age_months" INTEGER NOT NULL,
    "max_age_months" INTEGER NOT NULL,
    "normal_from" DECIMAL(4,1) NOT NULL,
    "mild_from" DECIMAL(4,1) NOT NULL,
    "moderate_from" DECIMAL(4,1) NOT NULL,

    CONSTRAINT "hemoglobin_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_intervals" (
    "id" UUID NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "appointment_type" "AppointmentType" NOT NULL,
    "min_age_months" INTEGER NOT NULL,
    "max_age_months" INTEGER NOT NULL,
    "interval_days" INTEGER NOT NULL,

    CONSTRAINT "appointment_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" BIGSERIAL NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity" VARCHAR(32) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" VARCHAR(45),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "account_id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "operation" VARCHAR(64) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("account_id","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_account_id_idx" ON "sessions"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_ipress_code_key" ON "facilities"("ipress_code");

-- CreateIndex
CREATE INDEX "facility_assignments_account_id_idx" ON "facility_assignments"("account_id");

-- CreateIndex
CREATE INDEX "facility_assignments_facility_id_idx" ON "facility_assignments"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");

-- CreateIndex
CREATE INDEX "catalog_versions_kind_status_valid_from_idx" ON "catalog_versions"("kind", "status", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_doses_catalog_version_id_vaccine_id_dose_number_key" ON "scheduled_doses"("catalog_version_id", "vaccine_id", "dose_number");

-- CreateIndex
CREATE UNIQUE INDEX "hemoglobin_thresholds_catalog_version_id_min_age_months_key" ON "hemoglobin_thresholds"("catalog_version_id", "min_age_months");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_intervals_catalog_version_id_appointment_type_m_key" ON "appointment_intervals"("catalog_version_id", "appointment_type", "min_age_months");

-- CreateIndex
CREATE INDEX "audit_events_entity_entity_id_occurred_at_idx" ON "audit_events"("entity", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events"("occurred_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_assignments" ADD CONSTRAINT "facility_assignments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_assignments" ADD CONSTRAINT "facility_assignments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_assignments" ADD CONSTRAINT "facility_assignments_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_assignments" ADD CONSTRAINT "facility_assignments_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_versions" ADD CONSTRAINT "catalog_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_doses" ADD CONSTRAINT "scheduled_doses_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_doses" ADD CONSTRAINT "scheduled_doses_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hemoglobin_thresholds" ADD CONSTRAINT "hemoglobin_thresholds_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_intervals" ADD CONSTRAINT "appointment_intervals_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_email_lowercase" CHECK ("email" = lower("email") AND length("email") >= 3),
  ADD CONSTRAINT "accounts_full_name_present" CHECK (length(trim("full_name")) >= 3),
  ADD CONSTRAINT "accounts_failed_attempts_range" CHECK ("failed_attempts" >= 0),
  ADD CONSTRAINT "accounts_totp_consistency" CHECK ("totp_enabled_at" IS NULL OR "totp_secret_encrypted" IS NOT NULL),
  ADD CONSTRAINT "accounts_version_positive" CHECK ("version" >= 1);

ALTER TABLE "facilities"
  ADD CONSTRAINT "facilities_ipress_code_format" CHECK ("ipress_code" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "facilities_altitude_range" CHECK ("altitude_meters" BETWEEN 0 AND 5000),
  ADD CONSTRAINT "facilities_version_positive" CHECK ("version" >= 1);

ALTER TABLE "facility_assignments"
  ADD CONSTRAINT "facility_assignments_end_consistency" CHECK (("ended_at" IS NULL) = ("ended_by_id" IS NULL)),
  ADD CONSTRAINT "facility_assignments_end_after_start" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");

CREATE UNIQUE INDEX "facility_assignments_one_active" ON "facility_assignments" ("account_id", "facility_id") WHERE "ended_at" IS NULL;

ALTER TABLE "catalog_versions"
  ADD CONSTRAINT "catalog_versions_publication_consistency" CHECK (
    ("status" = 'PUBLISHED') = ("valid_from" IS NOT NULL AND "published_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "catalog_versions_draft_without_end" CHECK ("status" = 'PUBLISHED' OR "valid_to" IS NULL),
  ADD CONSTRAINT "catalog_versions_validity_order" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from"),
  ADD CONSTRAINT "catalog_versions_version_positive" CHECK ("version" >= 1);

CREATE UNIQUE INDEX "catalog_versions_one_current" ON "catalog_versions" ("kind") WHERE "status" = 'PUBLISHED' AND "valid_to" IS NULL;

ALTER TABLE "scheduled_doses"
  ADD CONSTRAINT "scheduled_doses_dose_number_range" CHECK ("dose_number" BETWEEN 1 AND 10),
  ADD CONSTRAINT "scheduled_doses_age_order" CHECK ("recommended_age_days" >= 0 AND "max_age_days" >= "recommended_age_days");

ALTER TABLE "hemoglobin_thresholds"
  ADD CONSTRAINT "hemoglobin_thresholds_age_order" CHECK ("min_age_months" >= 0 AND "max_age_months" >= "min_age_months"),
  ADD CONSTRAINT "hemoglobin_thresholds_value_order" CHECK ("normal_from" > "mild_from" AND "mild_from" > "moderate_from" AND "moderate_from" > 0);

ALTER TABLE "appointment_intervals"
  ADD CONSTRAINT "appointment_intervals_age_order" CHECK ("min_age_months" >= 0 AND "max_age_months" >= "min_age_months"),
  ADD CONSTRAINT "appointment_intervals_days_range" CHECK ("interval_days" BETWEEN 1 AND 366);

CREATE FUNCTION "catalog_entries_only_in_drafts"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target_version uuid;
BEGIN
  target_version := CASE WHEN TG_OP = 'DELETE' THEN OLD."catalog_version_id" ELSE NEW."catalog_version_id" END;

  IF EXISTS (SELECT 1 FROM "catalog_versions" WHERE "id" = target_version AND "status" = 'PUBLISHED') THEN
    RAISE EXCEPTION 'Las entradas de una versión publicada no se modifican'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "scheduled_doses_only_in_drafts"
  BEFORE INSERT OR UPDATE OR DELETE ON "scheduled_doses"
  FOR EACH ROW EXECUTE FUNCTION "catalog_entries_only_in_drafts"();

CREATE TRIGGER "hemoglobin_thresholds_only_in_drafts"
  BEFORE INSERT OR UPDATE OR DELETE ON "hemoglobin_thresholds"
  FOR EACH ROW EXECUTE FUNCTION "catalog_entries_only_in_drafts"();

CREATE TRIGGER "appointment_intervals_only_in_drafts"
  BEFORE INSERT OR UPDATE OR DELETE ON "appointment_intervals"
  FOR EACH ROW EXECUTE FUNCTION "catalog_entries_only_in_drafts"();

CREATE FUNCTION "audit_events_reject_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events es de solo inserción: % no permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "audit_events_append_only"
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION "audit_events_reject_change"();

CREATE TRIGGER "audit_events_no_truncate"
  BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_events_reject_change"();
