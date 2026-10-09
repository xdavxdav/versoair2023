import type { PoolClient } from "pg";

export interface AdvisoryLockSession {
  tryLock(lockKey: number): Promise<boolean>;
  unlock(lockKey: number): Promise<void>;
  close(error?: Error): void;
}

export function createPgAdvisoryLockSession(
  client: Pick<PoolClient, "query" | "release">,
): AdvisoryLockSession {
  return {
    async tryLock(lockKey) {
      const result = await client.query(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [lockKey],
      );
      return result.rows[0]?.acquired === true;
    },
    async unlock(lockKey) {
      const result = await client.query(
        "SELECT pg_advisory_unlock($1) AS released",
        [lockKey],
      );
      if (result.rows[0]?.released !== true) {
        throw new Error(`PostgreSQL advisory lock ${lockKey} was not released`);
      }
    },
    close(error) {
      client.release(error);
    },
  };
}

export async function withAdvisoryLock<T>(
  lockKey: number,
  acquireSession: () => Promise<AdvisoryLockSession>,
  task: () => Promise<T>,
): Promise<{ acquired: false } | { acquired: true; result: T }> {
  const session = await acquireSession();
  let locked = false;
  let taskFailed = false;
  let sessionClosed = false;

  try {
    locked = await session.tryLock(lockKey);
    if (!locked) return { acquired: false };

    try {
      return { acquired: true, result: await task() };
    } catch (error) {
      taskFailed = true;
      throw error;
    }
  } finally {
    if (locked) {
      try {
        await session.unlock(lockKey);
      } catch (error) {
        const unlockError =
          error instanceof Error ? error : new Error(String(error));
        session.close(unlockError);
        sessionClosed = true;
        if (taskFailed) {
          console.error("[DB] Failed to release advisory lock:", unlockError);
        } else {
          throw unlockError;
        }
      }
    }

    if (!sessionClosed) session.close();
  }
}
