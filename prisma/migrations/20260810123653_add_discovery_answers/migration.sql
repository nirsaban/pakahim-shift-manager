-- CreateTable
CREATE TABLE "discovery_answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discovery_answers_questionId_key" ON "discovery_answers"("questionId");
