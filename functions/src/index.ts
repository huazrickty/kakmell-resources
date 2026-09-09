import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

setGlobalOptions({ maxInstances: 10 });
initializeApp();

const db = getFirestore();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApproveUserData {
  uid: string;
  role: "admin" | "kitchen";
}

interface ChangeUserRoleData {
  uid: string;
  newRole: string;
  devPassword: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function assertAdmin(uid: string): Promise<void> {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists || doc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

// ── approveUser ───────────────────────────────────────────────────────────────

export const approveUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(request.auth.uid);

  const { uid, role } = request.data as ApproveUserData;

  await db.collection("users").doc(uid).update({
    role,
    approved_at: FieldValue.serverTimestamp(),
    approved_by: request.auth.uid,
  });

  return { success: true };
});

// ── changeUserRole ────────────────────────────────────────────────────────────

export const changeUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { uid, newRole, devPassword } = request.data as ChangeUserRoleData;
  const DEV_PASSWORD = process.env.DEV_PASSWORD ?? "881188";

  if (devPassword !== DEV_PASSWORD) {
    throw new HttpsError("permission-denied", "Invalid developer password.");
  }

  await db.collection("users").doc(uid).update({ role: newRole });

  return { success: true };
});

// ── cleanupOldTaskAssignments ─────────────────────────────────────────────────
// Deletes daily_assignments date-docs (and their task subcollections) plus the
// matching task-photos/{date}/ Storage objects for dates older than 30 days.

const CLEANUP_RETENTION_DAYS = 30;

interface CleanupSummary {
  cutoff: string;
  datesDeleted: number;
  taskDocsDeleted: number;
  photosDeleted: number;
  errors: number;
}

// Today in Asia/Kuala_Lumpur (fixed UTC+8, no DST) minus retention, as YYYY-MM-DD
function getCutoffDate(): string {
  const mytNow = new Date(Date.now() + 8 * 3_600_000);
  mytNow.setUTCDate(mytNow.getUTCDate() - CLEANUP_RETENTION_DAYS);
  return mytNow.toISOString().slice(0, 10);
}

async function runTaskCleanup(): Promise<CleanupSummary> {
  const cutoff = getCutoffDate();
  const summary: CleanupSummary = {
    cutoff, datesDeleted: 0, taskDocsDeleted: 0, photosDeleted: 0, errors: 0,
  };

  // listDocuments() (not .get()) — the date parents are virtual documents that
  // were never written directly, only their tasks subcollections exist.
  const dateRefs = await db.collection("daily_assignments").listDocuments();
  const expired = dateRefs.filter(
    (ref) => /^\d{4}-\d{2}-\d{2}$/.test(ref.id) && ref.id < cutoff
  );

  const bucket = getStorage().bucket();

  for (const dateRef of expired) {
    try {
      // a) delete all task docs under this date (chunked — batch limit is 500)
      const taskRefs = await dateRef.collection("tasks").listDocuments();
      for (let i = 0; i < taskRefs.length; i += 500) {
        const batch = db.batch();
        taskRefs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
      summary.taskDocsDeleted += taskRefs.length;

      // b) delete the parent date doc (no-op if it never existed)
      await dateRef.delete();

      // c) delete photos under task-photos/{date}/ (empty prefix is fine)
      const [files] = await bucket.getFiles({ prefix: `task-photos/${dateRef.id}/` });
      await Promise.all(files.map((file) => file.delete()));
      summary.photosDeleted += files.length;

      summary.datesDeleted++;
    } catch (err) {
      summary.errors++;
      logger.error(`Task cleanup failed for date ${dateRef.id}`, err);
    }
  }

  logger.info("Task cleanup summary", summary);
  return summary;
}

export const cleanupOldTaskAssignments = onSchedule(
  { schedule: "every day 03:00", timeZone: "Asia/Kuala_Lumpur" },
  async () => {
    await runTaskCleanup();
  }
);

// Manual trigger for testing / on-demand purge. Admin only.
export const cleanupOldTaskAssignmentsManual = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(request.auth.uid);

  return await runTaskCleanup();
});
