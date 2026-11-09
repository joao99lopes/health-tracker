-- Authentication moves to Firebase Auth.
--
-- The previous library's sessions, password hashes and verification tokens
-- are dropped: Firebase cannot import its scrypt hashes, and existing users
-- set a new password through Firebase's reset email (scripts/firebase-migrate-users.mjs).
-- User rows, and every profile and measurement attached to them, are kept;
-- a row is linked to its Firebase account by email on first verified sign-in.
--
-- Irreversible: take a backup before applying (deploy/ops/backup.sh).

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
DROP COLUMN "image",
DROP COLUMN "name",
ADD COLUMN     "firebaseUid" TEXT,
ADD COLUMN     "sessionsValidAfter" TIMESTAMPTZ(3);

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "Verification";

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
