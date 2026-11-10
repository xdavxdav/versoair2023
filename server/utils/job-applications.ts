import type { RequestHandler } from "express";
import { pool } from "../db";
import { runOnce } from "./run-once";

// The table is created on first use, like saved_jobs, so a problem with it
// can never stop the server from booting. The CV is stored in the row because
// the host disk is wiped on every deploy.
export const JOB_APPLICATIONS_DDL = [
  `CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id VARCHAR,
    status VARCHAR DEFAULT 'submitted',
    applied_date TIMESTAMP DEFAULT NOW(),
    cover_letter TEXT,
    resume_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applicant_name TEXT`,
  `ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applicant_email TEXT`,
  `ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_name TEXT`,
  `ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_mime TEXT`,
  `ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_data BYTEA`,
  `CREATE INDEX IF NOT EXISTS job_applications_job_applicant_idx
    ON job_applications (job_id, applicant_id)`,
  `CREATE INDEX IF NOT EXISTS job_applications_applicant_idx
    ON job_applications (applicant_id)`,
];

const ensureJobApplicationsTable = runOnce(async () => {
  for (const statement of JOB_APPLICATIONS_DDL) await pool.query(statement);
});

export const withJobApplicationsTable: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    await ensureJobApplicationsTable();
    next();
  } catch (error) {
    console.error("[jobs] could not prepare job_applications:", error);
    res.status(500).json({
      success: false,
      error: "Applications are unavailable right now",
    });
  }
};

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

// The first bytes of each format, so a renamed file cannot pass as a CV.
const RESUME_FORMATS = {
  pdf: {
    mime: "application/pdf",
    signature: [0x25, 0x50, 0x44, 0x46],
  },
  doc: {
    mime: "application/msword",
    signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: [0x50, 0x4b, 0x03, 0x04],
  },
} as const;

export type ResumeFormat = keyof typeof RESUME_FORMATS;

export function resumeFormatOf(fileName: string): ResumeFormat | null {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase();
  return extension === "pdf" || extension === "doc" || extension === "docx"
    ? extension
    : null;
}

export function resumeMimeOf(format: ResumeFormat): string {
  return RESUME_FORMATS[format].mime;
}

export function isGenuineResume(content: Buffer, format: ResumeFormat) {
  const { signature } = RESUME_FORMATS[format];
  return (
    content.length > signature.length &&
    signature.every((byte, index) => content[index] === byte)
  );
}

// Keeps only the file's own name: no folders, quotes or control characters.
export function cleanResumeName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f"]/g, "").trim();
  return cleaned.slice(-120) || "resume";
}

export function decodeMultipartFileName(fileName: string): string {
  if (!/[ÃÂ]/.test(fileName)) return fileName;
  const decoded = Buffer.from(fileName, "latin1").toString("utf8");
  return decoded.includes("\uFFFD") ? fileName : decoded;
}
