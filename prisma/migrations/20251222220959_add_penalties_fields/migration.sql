-- AlterTable
ALTER TABLE "Match" ADD COLUMN "homePenalties" INTEGER,
ADD COLUMN "awayPenalties" INTEGER;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "predictedHomePenalties" INTEGER,
ADD COLUMN "predictedAwayPenalties" INTEGER;

