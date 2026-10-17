import { Link } from "wouter";

const STAFF_ROLES = [
  ["OWN", "Owner", "Full control of the platform."],
  ["ADM", "Admin", "Manages accounts, content and GeoAdmin."],
  ["MOD", "Moderator", "Reviews reports and moderates content."],
  ["SUP", "Support", "Helps members with account questions."],
  ["FIN", "Finance", "Handles payouts and billing questions."],
  ["GEO", "Geo-admin", "Maintains listings, maps and locations."],
];
const DIVISIONS = [
  ["D", "Discovery", "New artists getting started."],
  ["I", "Indie", "Independent artists building an audience."],
  ["P", "Pro", "Established professional artists."],
  ["E", "Elite", "Top-ranked artists by activity and involvement."],
  ["S", "Signed", "Artists under a Verso Air contract."],
  ["L", "Legend", "The highest division."],
];

function Row({ cells }: { cells: string[] }) {
  return (
    <tr className="border-t border-white/10">
      {cells.map((c, i) => (
        <td key={i} className={`px-3 py-2 ${i === 0 ? "font-mono text-purple-300" : ""}`}>
          {c}
        </td>
      ))}
    </tr>
  );
}

export default function IdGuide() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white">
      <h1 className="text-2xl font-bold">Recognize Verso Air IDs</h1>
      <p className="mt-2 text-sm text-white/70">
        Verso Air staff and artists carry an ID that explains who they are and
        what they do. This page explains how to read one. It never lists real
        people or real codes.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Staff ID</h2>
      <p className="mt-2 font-mono text-base text-purple-300">VS-ADM-JOE-0001-XXXXXX</p>
      <ul className="mt-3 space-y-1 text-sm text-white/80">
        <li><b>VS</b> — Verso Staff.</li>
        <li><b>ADM</b> — the role (see the chart below).</li>
        <li><b>JOE</b> — three letters from the person's name.</li>
        <li><b>0001</b> — the staff number.</li>
        <li><b>XXXXXX</b> — a private secret that is never published and never shared.</li>
      </ul>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-white/50"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">What it means</th></tr></thead>
        <tbody>{STAFF_ROLES.map((r) => <Row key={r[0]} cells={r} />)}</tbody>
      </table>

      <h2 className="mt-8 text-lg font-semibold">Artist ID</h2>
      <p className="mt-2 font-mono text-base text-purple-300">VA_NK-E_YYMMDD_…</p>
      <p className="mt-2 text-sm text-white/80">
        <b>VA</b> is Verso Air, then letters from the stage name, then the division
        letter below. The rest of the ID is private to the artist.
      </p>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-white/50"><tr><th className="px-3 py-2">Letter</th><th className="px-3 py-2">Division</th><th className="px-3 py-2">What it means</th></tr></thead>
        <tbody>{DIVISIONS.map((r) => <Row key={r[0]} cells={r} />)}</tbody>
      </table>

      <h2 className="mt-8 text-lg font-semibold">Stay safe</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
        <li>Staff never ask for your password or for the private part of an ID.</li>
        <li>An ID alone does not prove identity. If something feels wrong, contact us through the <Link href="/faq" className="underline">help center</Link>.</li>
        <li>Lost a staff card? Report it so it can be revoked right away.</li>
      </ul>
    </div>
  );
}
