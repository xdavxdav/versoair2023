import React from "react";
import { Link } from "wouter";

export default function ArtistsTab() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#101827] p-5 space-y-4">
      <h2 className="text-slate-100 font-medium">Artists</h2>
      <p className="text-sm text-slate-400">
        Use existing artist administration pages to avoid altering current workflows.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/contracts" className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800">
          Artist Contracts
        </Link>
        <Link href="/admin/streamroyale" className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800">
          StreamRoyale Admin
        </Link>
        <Link href="/artist-directory" className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800">
          Public Artist Directory
        </Link>
      </div>
    </div>
  );
}
