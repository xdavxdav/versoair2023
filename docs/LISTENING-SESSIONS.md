# Listening sessions: scheduled, live, together

Status: **core (music and text chat).** Live voice from the host is a separate
change and is not part of this document's behaviour. Nothing here sends a
message to anyone: the announcement is a draft that an admin copies by hand.

A listening session is a scheduled event with a host and an ordered set of
tracks. At the start time the public page shows **LIVE NOW**, everyone who taps
Join hears the same track at the same moment, and people chat on the page. When
it ends the page becomes a replay.

## How it works

```
admin builds a set -> listening_sessions row (starts_at, ends_at, set_tracks, gap)
                              |
public page  <-- GET /api/listening-sessions/:id  (detail, tracklist, status)
     |            server clock offset is estimated from each answer
     v
elapsed = server now - starts_at  ->  walk the ordered tracks (+ gap) -> current track and offset
```

- **Radio mode, no sync infrastructure.** The schedule is the truth. The browser
  computes what should be playing from the server clock (corrected for device
  clock error) and steers its one audio element toward it. If it drifts more
  than 2 seconds it re-seeks. A track that ends early waits for the next slot; a
  track that runs long is cut at the boundary.
- **Status follows the server clock** (`scheduled`, `live`, `ended`) and is
  derived on every read, so no timer has to fire. The stored status column is
  brought up to date when the public list is read; `cancelled` is the only status
  set by hand.
- **Track lengths** are measured in the admin's browser when the set is built
  and stored on the session row (`set_tracks`, JSONB). The server uses them to
  compute the schedule and the end time.
- **A track that is unpublished or deleted later** keeps its slot (the schedule
  does not move) and is shown as unavailable; the clock keeps going.
- **Autoplay needs a tap.** Browsers block sound until the listener taps, so the
  page has a Join button, and a "tap to listen" button if the browser pauses the
  sound later.

## Public pages and API

| Page | Purpose |
|---|---|
| `/sessions` | Live now, upcoming (up to 50) and the 20 most recent ended. Cancelled sessions are hidden. |
| `/sessions/:id` | Countdown, LIVE NOW with Join, now-playing, tracklist with badges, chat, replay after the end. A cancelled session still opens by direct link and says so. |

| Method | Path | Access |
|---|---|---|
| GET | `/api/listening-sessions` | public |
| GET | `/api/listening-sessions/:id` | public |
| GET | `/api/listening-sessions/:id/now-playing` | public, never cached |
| GET | `/api/listening-sessions/:id/chat` | public, read-only |
| GET | `/api/listening-sessions/admin/status`, `/list`, `/tracks`, `/hosts`, `/playlists`, `/playlists/:id/tracks`, `/:id` | admin panel |
| POST | `/api/listening-sessions/admin` | admin panel (create) |
| PATCH | `/api/listening-sessions/admin/:id` | admin panel (edit before the start) |
| POST | `/api/listening-sessions/admin/:id/cancel` | admin panel (cancel; there is no delete) |

The public answers never contain an email, a user id or a royalty share. Only
published tracks can be placed in a set.

### Routing notes

- The two pages are registered in **both** `client/src/App.tsx` (the production
  build) and `client/src/AppMusic.tsx` (the separate music build), before the
  catch-all.
- `/sessions` is listed in `client/src/lib/beta-route-access.ts`. While
  `BETA_SCOPE_FREEZE` is on, any path missing from that list is redirected to
  the home page, so removing the entry makes the pages unreachable. A test covers
  it, and `/sessionsx` stays outside the scope.
- The pages use the main-site layout, not the music sidebar, because `/sessions`
  is not in `MUSIC_ROUTE_PREFIXES`. That is deliberate and easy to change later.
- Session audio belongs to the session page: it stops when the listener leaves
  the page, and joining pauses the global player so two sounds never overlap.
- `npm run check:api` reads these routes too (template-literal paths and the
  admin sub-router are understood since this change).

## Admin: schedule a session

GeoAdmin, **Listening sessions**. Access is **owner only** by default. To let
the admin team schedule sessions, move `listening-sessions` from
`OWNER_ONLY_ADMIN_PANEL_SECTIONS` to `DELEGATED_ADMIN_PANEL_SECTIONS` in
`shared/admin-panel-access.ts` and update its test.

1. **New session.** Title, host, date and time **with an explicit time zone**
   (default America/Toronto), the gap between tracks in seconds, a description.
2. **Build the set.** Search published tracks and add them in order, or load a
   playlist. Each row shows a **Verso Signed** badge with the grade, or
   **Regular**. **Signed first** orders S, A, B, C, then regular artists (stable
   inside each group); it is a suggestion and you can reorder freely. Track
   lengths are measured in your browser; if one cannot be read, type the seconds.
3. **Check the summary.** Total length, the computed end time, and a warning if
   the session overlaps another one.
4. **Save.** Then open the **announcement**: FR or EN text with the time shown in
   Toronto, Paris and Abidjan, a Copy button, and an "Open in WhatsApp" link that
   only opens the share chooser.
5. **Cancel** is the only way to remove a session. It disappears from the public
   list; the table row stays.

Announcement rules: one chat at a time, opted-in contacts only, no broadcast
lists, and the text ends with the STOP line. Nothing is sent for you.

Limits: title 160 characters, description 2000, at most 60 tracks, a track at
most 60 minutes, gap at most 300 seconds, a set at most 6 hours, a start at most
a year ahead.

## Signed and regular artists

The source of truth is **`artist_contracts.status = 'approved'`** (newest
approved contract per artist, with its grade). `music_artists.label_status` is
**ignored**: its database default is `signed`, so it cannot be trusted.

- Signed: a **Verso Signed** badge with the grade letter S, A, B or C. Tier names,
  the featured flag and share percentages are never shown publicly.
- Regular: no badge. They appear in sets like any published track.

## Plays and royalties

The player records a play through the same call `/stream` uses, once per track
per join, after **30 seconds of real listening**, and only for a signed-in
listener. This feature adds no royalty rules: whatever StreamRoyale does with a
`/stream` play it does with a session play.

Building a set does not count as a play. The admin's browser measures each
track's length by loading only its metadata, and the stream endpoint
(`GET /api/music/tracks/:id/stream`) does not count a request that carries a
`Range` header, which audio elements send. This is read from the code, not yet
observed in a browser: during the rehearsal, note a track's play count before and
after building a set with it.

## Live comments

Comments reuse the existing community chat. The session page reads the posts
made inside the session's time window and highlights the host's messages
(matched by user id on the server). Posting uses the existing community
endpoint, so its rules apply unchanged: sign-in required, slow mode, 2000
characters, moderation by hiding. It is the global room, not a private one per
session. Messages are always rendered as plain text.

## Configuration

No environment variable is needed to go live. One optional kill switch:

| Variable | Default | Purpose |
|---|---|---|
| `LISTENING_SESSIONS_ENABLED` | unset (on) | `false`, `0`, `off`, `no` or `disabled` (any case) makes every `/api/listening-sessions` route answer `404`. It is read on each request. |

## Release and rollback

- Migration `0009_listening_sessions.sql` creates one table. The same statements
  run as an idempotent ensure (`CREATE TABLE IF NOT EXISTS`, one transaction,
  an advisory lock) **the first time any sessions route is called**, not at boot.
  Deploying this change does not touch the database by itself.
- If that ensure fails, the sessions routes answer `503 not_ready` and the
  failure is retried on the next request. The rest of the app is unaffected.
- A parity test keeps the migration and the Drizzle table in agreement.
- **Rollback:** set the kill switch, or revert the change. The table stays
  (harmless); nothing is ever dropped.
- Recommended before the first production use: rehearse the migration on a
  throwaway database branch instead of learning on production data.

## First live test

Use a "[TEST]" session and cancel it afterwards.

1. Create "[TEST] ..." starting a few minutes ahead, two short published tracks,
   gap 20 seconds. Use the "start in N minutes" buttons.
2. Open `/sessions/:id` on a phone and a desktop: the countdown turns into
   **LIVE NOW** at the start time. Tap Join on both; both hear the same track
   within about 2 seconds.
3. Post a chat message from a second account. The host's messages appear
   highlighted.
4. After the end the replay is available, and the signed badge shows only on
   contracted artists.
5. Cancel the test session; it disappears from the public list.

## Operations

- Rate limits per IP per minute: public reads 600, admin reads 120, admin
  writes 20.
- Short server caches: list 15 s, a session 3 s, its tracklist 30 s, chat 2 s.
  The now-playing answer is never cached.
- The page polls the session every 30 s while scheduled and 25 s while live,
  retries after 5, 10, 20 and 30 seconds when the network fails, and refreshes
  when the tab comes back or the connection returns. A 404 is final.
- Server logs for this feature are prefixed `[LISTENING_SESSIONS]`.
