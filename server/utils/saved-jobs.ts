import type { RequestHandler } from "express";
import { pool } from "../db";
import { runOnce } from "./run-once";

// One row per user and job. The table is created on first use, so a problem
// with it can never stop the server from booting.
export const SAVED_JOBS_DDL = [
  `CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    saved_date TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS saved_jobs_user_job_key
    ON saved_jobs (user_id, job_id)`,
];

const ensureSavedJobsTable = runOnce(async () => {
  for (const statement of SAVED_JOBS_DDL) await pool.query(statement);
});

export const withSavedJobsTable: RequestHandler = async (_req, res, next) => {
  try {
    await ensureSavedJobsTable();
    next();
  } catch (error) {
    console.error("[jobs] could not prepare saved_jobs:", error);
    res
      .status(500)
      .json({ success: false, error: "Saved jobs are unavailable right now" });
  }
};
