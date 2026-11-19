export interface ByteRange {
  start: number;
  end: number;
}

// Reads a single-range `Range: bytes=...` header (RFC 7233) against a file of
// `size` bytes. Returns the inclusive range to send, "unsatisfiable" when it
// lies outside the file (answer 416), or null when the header is absent,
// malformed or asks for several ranges (send the whole file instead).
export function parseByteRange(
  header: string | undefined,
  size: number,
): ByteRange | "unsatisfiable" | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec((header ?? "").trim());
  if (!match) return null;
  const [, first, last] = match;
  if (first === "" && last === "") return null;

  if (first === "") {
    // Suffix range: the final N bytes.
    const length = Number(last);
    return length === 0 || size === 0
      ? "unsatisfiable"
      : { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(first);
  if (last !== "" && Number(last) < start) return null;
  if (start >= size) return "unsatisfiable";
  return {
    start,
    end: last === "" ? size - 1 : Math.min(Number(last), size - 1),
  };
}
