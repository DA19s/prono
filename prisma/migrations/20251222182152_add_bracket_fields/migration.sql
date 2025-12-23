-- CreateEnum
CREATE TYPE "BracketRound" AS ENUM ('ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracketPosition" INTEGER,
ADD COLUMN     "bracketRound" "BracketRound",
ADD COLUMN     "parentMatch1Id" TEXT,
ADD COLUMN     "parentMatch2Id" TEXT;

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_parentMatch1Id_fkey" FOREIGN KEY ("parentMatch1Id") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_parentMatch2Id_fkey" FOREIGN KEY ("parentMatch2Id") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
