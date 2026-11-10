/** Whether the signed-in user's artist profile is already in one contest. */
export interface ArenaMyEntry {
  hasArtistProfile: boolean;
  entered: boolean;
  seedPosition: number | null;
}

export type ArenaEntryPanel =
  | "hidden"
  | "sign-in"
  | "loading"
  | "needs-artist-profile"
  | "entered"
  | "can-enter";

interface ArenaEntryInput {
  contestStatus: string | undefined;
  signedIn: boolean;
  myEntry: ArenaMyEntry | null | undefined;
  loading: boolean;
}

/** What the "enter this contest" card should offer. Only open contests take entries. */
export function arenaEntryPanel(input: ArenaEntryInput): ArenaEntryPanel {
  if (input.contestStatus !== "open") return "hidden";
  if (!input.signedIn) return "sign-in";
  if (input.loading) return "loading";
  // The lookup is a convenience: when it failed the server still decides on click.
  if (!input.myEntry) return "can-enter";
  if (input.myEntry.entered) return "entered";
  if (!input.myEntry.hasArtistProfile) return "needs-artist-profile";
  return "can-enter";
}

export function parseArenaMyEntry(body: unknown): ArenaMyEntry | null {
  const data = body as Record<string, unknown> | null | undefined;
  if (!data || data.success !== true) return null;
  return {
    hasArtistProfile: data.hasArtistProfile === true,
    entered: data.entered === true,
    seedPosition:
      typeof data.seedPosition === "number" ? data.seedPosition : null,
  };
}

// Arena and VersaVids fail in the same two shapes, so one shared helper reads both.
export { apiErrorMessage as arenaErrorMessage } from "@shared/api-error";
