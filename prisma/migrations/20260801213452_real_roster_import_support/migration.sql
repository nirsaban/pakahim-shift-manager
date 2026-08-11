-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
