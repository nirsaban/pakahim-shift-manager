-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('TAXI', 'RAIL', 'NONE');

-- AlterTable
ALTER TABLE "duties" ADD COLUMN     "endTransport" "TransportMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "startTransport" "TransportMode" NOT NULL DEFAULT 'NONE';
