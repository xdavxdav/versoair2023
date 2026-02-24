/**
 * Mentions Parser Utility
 * Parses @mentions and #hashtags from text
 * Useful for extracting business mentions, tags, and references
 */

export interface ParsedMention {
  type: "mention" | "hashtag" | "text";
  value: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedContent {
  mentions: string[];
  hashtags: string[];
  plainText: string;
  tokens: ParsedMention[];
}

/**
 * Parse mentions (@mention) and hashtags (#hashtag) from text
 * @param text - The text to parse
 * @returns Parsed content with mentions, hashtags, and tokens
 */
export function parseMentions(text: string): ParsedContent {
  if (!text) {
    return {
      mentions: [],
      hashtags: [],
      plainText: "",
      tokens: [],
    };
  }

  const mentions: string[] = [];
  const hashtags: string[] = [];
  const tokens: ParsedMention[] = [];

  // Regex patterns
  const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;

  let match;

  // Parse mentions
  while ((match = mentionRegex.exec(text)) !== null) {
    const mention = match[1];
    if (!mentions.includes(mention)) {
      mentions.push(mention);
    }
    tokens.push({
      type: "mention",
      value: mention,
      originalText: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Parse hashtags
  while ((match = hashtagRegex.exec(text)) !== null) {
    const hashtag = match[1];
    if (!hashtags.includes(hashtag)) {
      hashtags.push(hashtag);
    }
    tokens.push({
      type: "hashtag",
      value: hashtag,
      originalText: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Sort tokens by position
  tokens.sort((a, b) => a.startIndex - b.startIndex);

  // Build plain text by removing mentions and hashtags
  let plainText = text;
  const sortedTokens = [...tokens].sort((a, b) => b.startIndex - a.startIndex);
  for (const token of sortedTokens) {
    plainText =
      plainText.slice(0, token.startIndex) + plainText.slice(token.endIndex);
  }
  plainText = plainText.trim();

  return {
    mentions,
    hashtags,
    plainText,
    tokens,
  };
}

/**
 * Link mentions to business names
 * @param text - The text containing mentions
 * @param businesses - Array of business objects with name/title
 * @returns Text with mentions replaced with links or formatted
 */
export function linkBusinessMentions(
  text: string,
  businesses: Array<{ id: string | number; name: string; title?: string }>,
): string {
  let result = text;

  for (const business of businesses) {
    const businessName = business.title || business.name;
    // Create regex for business mentions (case-insensitive)
    const regex = new RegExp(`@${businessName}\\b`, "gi");
    result = result.replace(
      regex,
      `[@${businessName}](business:${business.id})`,
    );
  }

  return result;
}

/**
 * Extract business mentions from text
 * @param text - The text to search
 * @param businesses - Array of available businesses
 * @returns Array of mentioned businesses
 */
export function extractBusinessMentions(
  text: string,
  businesses: Array<{ id: string | number; name: string; title?: string }>,
): Array<{ id: string | number; name: string }> {
  const parsed = parseMentions(text);
  const mentionedBusinesses: Array<{ id: string | number; name: string }> = [];

  for (const mention of parsed.mentions) {
    const found = businesses.find(
      (b) =>
        b.name.toLowerCase() === mention.toLowerCase() ||
        (b.title && b.title.toLowerCase() === mention.toLowerCase()),
    );
    if (found) {
      mentionedBusinesses.push({
        id: found.id,
        name: found.name,
      });
    }
  }

  return mentionedBusinesses;
}

/**
 * Format mentions and hashtags for display
 * Converts text to include formatted mentions and hashtags
 * @param text - The text to format
 * @returns HTML-safe formatted text with highlight markup
 */
export function formatMentionsForDisplay(text: string): string {
  let result = text;

  // Format mentions
  result = result.replace(
    /@([a-zA-Z0-9_\-\.]+)/g,
    '<span class="mention">@$1</span>',
  );

  // Format hashtags
  result = result.replace(
    /#([a-zA-Z0-9_]+)/g,
    '<span class="hashtag">#$1</span>',
  );

  return result;
}

/**
 * Validate mention exists
 * @param mention - The mention to validate (without @)
 * @param businesses - Array of businesses to check against
 * @returns true if mention matches a business
 */
export function isValidBusinessMention(
  mention: string,
  businesses: Array<{ id: string | number; name: string; title?: string }>,
): boolean {
  return businesses.some(
    (b) =>
      b.name.toLowerCase() === mention.toLowerCase() ||
      (b.title && b.title.toLowerCase() === mention.toLowerCase()),
  );
}

/**
 * Get mention suggestions based on partial text
 * @param partialMention - The partial mention text (without @)
 * @param businesses - Array of businesses to search
 * @param limit - Max suggestions to return
 * @returns Array of suggested business names
 */
export function getMentionSuggestions(
  partialMention: string,
  businesses: Array<{ id: string | number; name: string; title?: string }>,
  limit: number = 5,
): Array<{ id: string | number; name: string; title?: string }> {
  const lowerPartial = partialMention.toLowerCase();
  return businesses
    .filter(
      (b) =>
        b.name.toLowerCase().includes(lowerPartial) ||
        (b.title && b.title.toLowerCase().includes(lowerPartial)),
    )
    .slice(0, limit);
}
