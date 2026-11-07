import { isSignedGrade, type SignedGrade } from "../../shared/listening-session";

export interface SignedArtist {
  grade: SignedGrade;
  canBeFeatured: boolean;
}

interface QueryDb {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

/**
 * Which of these artists are signed to Verso Air, and at what grade.
 *
 * The only source of truth is `artist_contracts`: a contract the admin review
 * approved (status 'approved', with a real grade S/A/B/C). `music_artists.label_status`
 * is deliberately ignored: its column default is 'signed', so it is true for artists
 * who never had a contract. An artist missing from the result is a regular artist.
 * When an artist has several approved contracts, the most recently reviewed one wins.
 */
export async function getSignedArtistMap(
  db: QueryDb,
  artistIds: readonly (number | null | undefined)[],
): Promise<Map<number, SignedArtist>> {
  const ids = Array.from(
    new Set(
      artistIds.filter(
        (id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0,
      ),
    ),
  );
  const signed = new Map<number, SignedArtist>();
  if (ids.length === 0) return signed;

  const result = await db.query(
    `SELECT DISTINCT ON (artist_id) artist_id, grade, can_be_featured
       FROM artist_contracts
      WHERE artist_id = ANY($1::int[])
        AND status = 'approved'
        AND grade IN ('S', 'A', 'B', 'C')
      ORDER BY artist_id, reviewed_at DESC NULLS LAST, id DESC`,
    [ids],
  );
  for (const row of result.rows) {
    if (!isSignedGrade(row.grade)) continue;
    signed.set(Number(row.artist_id), {
      grade: row.grade,
      canBeFeatured: row.can_be_featured === true,
    });
  }
  return signed;
}
