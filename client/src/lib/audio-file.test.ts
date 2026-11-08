import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  AUDIO_ACCEPT,
  MAX_AUDIO_UPLOAD_BYTES,
  audioFileProblem,
  audioInputAccept,
  isAcceptedAudioFile,
  isIosLike,
} from "./audio-file";

const IPHONE = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
};
const IPADOS = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  platform: "MacIntel",
  maxTouchPoints: 5,
};
const DESKTOP_MAC = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  platform: "MacIntel",
  maxTouchPoints: 0,
};

test("iOS devices get an extension-only accept (no audio/*, so no camera or photo options)", () => {
  assert.equal(isIosLike(IPHONE), true);
  assert.equal(isIosLike(IPADOS), true);
  for (const p of [IPHONE, IPADOS]) {
    const accept = audioInputAccept(p) ?? "";
    assert.ok(accept.includes(".mp3"));
    assert.ok(!accept.includes("/"), "must not contain a mime type");
  }
});

test("desktop keeps an explicit extension list plus audio/*", () => {
  assert.equal(isIosLike(DESKTOP_MAC), false);
  assert.equal(audioInputAccept(DESKTOP_MAC), AUDIO_ACCEPT);
  assert.ok(AUDIO_ACCEPT.includes(".mp3"));
  assert.ok(AUDIO_ACCEPT.includes("audio/*"));
});

test("files are accepted by mime type or by extension", () => {
  assert.equal(isAcceptedAudioFile({ name: "a.mp3", type: "" }), true);
  assert.equal(isAcceptedAudioFile({ name: "A.M4A", type: "" }), true);
  assert.equal(isAcceptedAudioFile({ name: "x", type: "audio/mpeg" }), true);
  assert.equal(isAcceptedAudioFile({ name: "a.exe", type: "" }), false);
  assert.equal(
    isAcceptedAudioFile({ name: "a.pdf", type: "application/pdf" }),
    false,
  );
});

test("audioFileProblem reports the wrong type and the size limit", () => {
  assert.equal(audioFileProblem({ name: "a.mp3", type: "", size: 10 }), null);
  assert.match(
    audioFileProblem({ name: "a.txt", type: "text/plain", size: 10 }) ?? "",
    /not a supported audio file/,
  );
  assert.match(
    audioFileProblem({
      name: "a.mp3",
      type: "audio/mpeg",
      size: MAX_AUDIO_UPLOAD_BYTES + 1,
    }) ?? "",
    /larger than/,
  );
});

test("the client limit matches the server's multer limit", () => {
  const server = readFileSync("server/routes/music.ts", "utf8");
  const m = server.match(/fileSize:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
  assert.ok(m, "multer fileSize limit not found");
  assert.equal(Number(m[1]) * 1024 * 1024, MAX_AUDIO_UPLOAD_BYTES);
});

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

test("no audio file input hard-codes accept; all use audioInputAccept()", () => {
  const offenders = sourceFiles("client/src").filter((f) => {
    const src = readFileSync(f, "utf8");
    return /accept=(?:"[^"]*audio[^"]*"|'[^']*audio[^']*'|\{["'`][^}]*audio)/i.test(
      src,
    );
  });
  assert.deepEqual(offenders, []);
});

function zOf(file: string): number[] {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/z-\[(\d+)\]/g)].map((m) => Number(m[1]));
}

test("select, popover, dropdown and tooltip render above dialogs and sheets", () => {
  const modal = Math.max(
    ...zOf("client/src/components/ui/dialog.tsx"),
    ...zOf("client/src/components/ui/sheet.tsx"),
  );
  for (const f of ["select", "popover", "dropdown-menu", "tooltip"]) {
    const file = `client/src/components/ui/${f}.tsx`;
    const floating = zOf(file);
    assert.ok(floating.length > 0, `${file} has no explicit z-index`);
    assert.ok(
      Math.min(...floating) > modal,
      `${file} z-index ${Math.min(...floating)} must be above modal layer ${modal}`,
    );
  }
});

test("no dialog or sheet is raised to the floating layer or above", () => {
  const floatingFloor = Math.min(
    ...zOf("client/src/components/ui/select.tsx"),
  );
  const offenders: string[] = [];
  for (const f of sourceFiles("client/src")) {
    if (f.includes("components/ui/")) continue;
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(
      /<(?:Dialog|Sheet|AlertDialog)Content[^>]*z-\[(\d+)\]/g,
    )) {
      if (Number(m[1]) >= floatingFloor) offenders.push(`${f}: z-[${m[1]}]`);
    }
  }
  assert.deepEqual(offenders, []);
});
