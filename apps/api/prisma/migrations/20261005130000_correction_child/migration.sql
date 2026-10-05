-- AlterTable
ALTER TABLE "correction_requests" ADD COLUMN     "child_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "correction_requests_child_id_status_idx" ON "correction_requests"("child_id", "status");

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

