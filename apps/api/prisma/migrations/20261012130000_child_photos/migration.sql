-- CreateTable
CREATE TABLE "child_photos" (
    "account_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "content_type" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "child_photos_pkey" PRIMARY KEY ("account_id","child_id")
);

-- AddForeignKey
ALTER TABLE "child_photos" ADD CONSTRAINT "child_photos_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_photos" ADD CONSTRAINT "child_photos_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "child_photos"
  ADD CONSTRAINT "child_photos_content_type" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "child_photos_size" CHECK (octet_length("data") BETWEEN 100 AND 716800);
