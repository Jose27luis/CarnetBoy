-- CreateTable
CREATE TABLE "security_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totp_required" BOOLEAN NOT NULL,
    "staff_password_change" BOOLEAN NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "security_settings" ADD CONSTRAINT "security_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "security_settings"
  ADD CONSTRAINT "security_settings_single_row" CHECK ("id" = 1),
  ADD CONSTRAINT "security_settings_version_positive" CHECK ("version" >= 1);
