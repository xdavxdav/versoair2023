import type { TxClient, TxPool } from "./marketing-checkout";

/**
 * Runs `work` inside BEGIN/COMMIT on a dedicated client. Any error rolls the
 * transaction back and is rethrown, and the client is always released.
 */
export async function inTransaction<T>(
  db: TxPool,
  work: (client: TxClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
