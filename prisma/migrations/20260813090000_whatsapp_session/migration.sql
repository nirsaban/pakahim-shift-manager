-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('PENDING', 'QR', 'CONNECTED', 'DISCONNECTED', 'LOGGED_OUT');

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "creds" JSONB,
    "status" "WhatsAppStatus" NOT NULL DEFAULT 'PENDING',
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);
