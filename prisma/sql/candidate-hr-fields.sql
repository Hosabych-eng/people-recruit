-- HR Candidate profile fields + CandidateLink
-- Run in Supabase SQL Editor if `prisma db push` cannot reach the DB.

ALTER TABLE "candidates"
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram" TEXT,
  ADD COLUMN IF NOT EXISTS "offerLink" TEXT,
  ADD COLUMN IF NOT EXISTS "firstContactDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastContactDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "candidate_links" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "candidate_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "candidate_links_candidateId_idx"
  ON "candidate_links"("candidateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_links_candidateId_fkey'
  ) THEN
    ALTER TABLE "candidate_links"
      ADD CONSTRAINT "candidate_links_candidateId_fkey"
      FOREIGN KEY ("candidateId") REFERENCES "candidates"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
