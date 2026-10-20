export function markNotificationReadStatement(
  notificationId: string,
  userId: number,
): { text: string; values: [string, number] } {
  return {
    text: `UPDATE notifications
           SET read = true, is_read = true, read_at = NOW()
           WHERE id::text = $1 AND user_id = $2`,
    values: [notificationId, userId],
  };
}
