-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('VAGINAL', 'CESAREAN');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('MOTHER', 'FATHER', 'OTHER');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "dni" CHAR(8),
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL,
    "dni" CHAR(8),
    "cnv" VARCHAR(12),
    "given_names" VARCHAR(120) NOT NULL,
    "paternal_surname" VARCHAR(80) NOT NULL,
    "maternal_surname" VARCHAR(80) NOT NULL,
    "sex" "Sex" NOT NULL,
    "birth_date" DATE NOT NULL,
    "gestational_weeks" INTEGER,
    "blood_type" VARCHAR(3),
    "created_by_id" UUID NOT NULL,
    "created_at_facility_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_records" (
    "child_id" UUID NOT NULL,
    "birth_place" VARCHAR(160),
    "delivery_type" "DeliveryType",
    "weight_grams" INTEGER,
    "length_cm" DECIMAL(4,1),
    "head_circumference_cm" DECIMAL(4,1),
    "apgar_1" INTEGER,
    "apgar_5" INTEGER,

    CONSTRAINT "birth_records_pkey" PRIMARY KEY ("child_id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL,
    "dni" CHAR(8) NOT NULL,
    "given_names" VARCHAR(120) NOT NULL,
    "paternal_surname" VARCHAR(80) NOT NULL,
    "maternal_surname" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(15),
    "email" VARCHAR(254),
    "account_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_links" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "relationship" "Relationship" NOT NULL,
    "status" "LinkStatus" NOT NULL,
    "consent_version" VARCHAR(16) NOT NULL,
    "consent_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "revoked_by_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(500),
    "revocation_document" VARCHAR(160),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "guardian_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_codes" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "issued_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "children_dni_key" ON "children"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "children_cnv_key" ON "children"("cnv");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_dni_key" ON "guardians"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_account_id_key" ON "guardians"("account_id");

-- CreateIndex
CREATE INDEX "guardian_links_child_id_idx" ON "guardian_links"("child_id");

-- CreateIndex
CREATE INDEX "guardian_links_guardian_id_idx" ON "guardian_links"("guardian_id");

-- CreateIndex
CREATE INDEX "activation_codes_link_id_idx" ON "activation_codes"("link_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_dni_key" ON "accounts"("dni");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_created_at_facility_id_fkey" FOREIGN KEY ("created_at_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_records" ADD CONSTRAINT "birth_records_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "guardian_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_dni_format" CHECK ("dni" IS NULL OR "dni" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "accounts_login_identifier" CHECK (
    ("role" = 'GUARDIAN' AND "dni" IS NOT NULL) OR ("role" <> 'GUARDIAN' AND "email" IS NOT NULL)
  );

ALTER TABLE "children"
  ADD CONSTRAINT "children_document_required" CHECK ("dni" IS NOT NULL OR "cnv" IS NOT NULL),
  ADD CONSTRAINT "children_dni_format" CHECK ("dni" IS NULL OR "dni" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "children_cnv_format" CHECK ("cnv" IS NULL OR "cnv" ~ '^[0-9]{8,12}$'),
  ADD CONSTRAINT "children_names_present" CHECK (
    length(trim("given_names")) >= 1 AND length(trim("paternal_surname")) >= 1 AND length(trim("maternal_surname")) >= 1
  ),
  ADD CONSTRAINT "children_birth_date_range" CHECK ("birth_date" >= DATE '2000-01-01'),
  ADD CONSTRAINT "children_gestational_weeks_range" CHECK ("gestational_weeks" IS NULL OR "gestational_weeks" BETWEEN 22 AND 44),
  ADD CONSTRAINT "children_blood_type_values" CHECK (
    "blood_type" IS NULL OR "blood_type" IN ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')
  ),
  ADD CONSTRAINT "children_version_positive" CHECK ("version" >= 1);

ALTER TABLE "birth_records"
  ADD CONSTRAINT "birth_records_weight_range" CHECK ("weight_grams" IS NULL OR "weight_grams" BETWEEN 300 AND 6500),
  ADD CONSTRAINT "birth_records_length_range" CHECK ("length_cm" IS NULL OR "length_cm" BETWEEN 25 AND 65),
  ADD CONSTRAINT "birth_records_head_range" CHECK ("head_circumference_cm" IS NULL OR "head_circumference_cm" BETWEEN 18 AND 45),
  ADD CONSTRAINT "birth_records_apgar_range" CHECK (
    ("apgar_1" IS NULL OR "apgar_1" BETWEEN 0 AND 10) AND ("apgar_5" IS NULL OR "apgar_5" BETWEEN 0 AND 10)
  );

ALTER TABLE "guardians"
  ADD CONSTRAINT "guardians_dni_format" CHECK ("dni" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "guardians_phone_format" CHECK ("phone" IS NULL OR "phone" ~ '^[0-9]{7,15}$'),
  ADD CONSTRAINT "guardians_email_lowercase" CHECK ("email" IS NULL OR "email" = lower("email"));

ALTER TABLE "guardian_links"
  ADD CONSTRAINT "guardian_links_revocation_consistency" CHECK (
    ("status" = 'REVOKED') = ("revoked_at" IS NOT NULL AND "revoked_by_id" IS NOT NULL AND "revocation_reason" IS NOT NULL)
  ),
  ADD CONSTRAINT "guardian_links_version_positive" CHECK ("version" >= 1);

CREATE UNIQUE INDEX "guardian_links_one_open" ON "guardian_links" ("child_id", "guardian_id") WHERE "status" <> 'REVOKED';

ALTER TABLE "activation_codes"
  ADD CONSTRAINT "activation_codes_hash_format" CHECK ("code_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "activation_codes_expiry_after_issue" CHECK ("expires_at" > "created_at");

CREATE UNIQUE INDEX "activation_codes_one_open" ON "activation_codes" ("link_id") WHERE "used_at" IS NULL AND "revoked_at" IS NULL;
CREATE INDEX "activation_codes_hash_idx" ON "activation_codes" ("code_hash");
