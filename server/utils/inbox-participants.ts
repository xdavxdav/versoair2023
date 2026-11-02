// Most inbox threads point at another user account, so `participantId` is that user's id.
// A business_network thread points at a business: its `participantId` is a business id.
// Reading it as a user id puts another person's name on the thread and mirrors the messages
// into the inbox of whichever account happens to share that number.
const THREADS_WITHOUT_A_USER_PARTICIPANT = new Set(["business_network"]);

export function participantIsUser(type: string | null | undefined): boolean {
  return !THREADS_WITHOUT_A_USER_PARTICIPANT.has(String(type));
}

/**
 * A business id and a user id can be the same number, so two threads with the same
 * `participantId` are only the same conversation when they point at the same kind of thing.
 */
export function sameKindOfParticipant(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return participantIsUser(a) === participantIsUser(b);
}

/**
 * The user whose own inbox should receive a copy of a message, or null when the thread
 * has no real user on the other side (support, business-only threads, or the sender).
 */
export function mirrorRecipientUserId(
  conversation: {
    type: string | null | undefined;
    participantId: string | number | null | undefined;
  },
  senderUserId: number,
): number | null {
  if (!participantIsUser(conversation.type)) return null;
  const recipient = Number(conversation.participantId);
  if (!Number.isSafeInteger(recipient) || recipient <= 0) return null;
  return recipient === Number(senderUserId) ? null : recipient;
}
