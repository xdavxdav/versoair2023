import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  pageContext: z.string().max(1000).optional(),
});

export type ChatRequestMessage = z.infer<typeof chatMessageSchema>;

export function buildChatRequest(
  messages: readonly ChatRequestMessage[],
  pageContext: string,
) {
  return chatRequestSchema.parse({
    messages: messages.slice(-12).map(({ role, content }) => ({ role, content })),
    pageContext,
  });
}
