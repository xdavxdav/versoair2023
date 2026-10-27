import fs from "node:fs";
import path from "node:path";

// Appends the deployed commit as semver build metadata so a server-only fix
// can be proven in production from the public health endpoint.
export function formatAppVersion(
  base: string,
  commit: string | undefined,
): string {
  const sha = (commit ?? "").trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha) || base.includes("+")) return base;
  return `${base}+${sha.slice(0, 7).toLowerCase()}`;
}

export function getAppVersion(env: NodeJS.ProcessEnv = process.env): string {
  let base = env.APP_VERSION;
  if (!base) {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
      ) as { version?: string };
      base = packageJson.version;
    } catch {
      base = undefined;
    }
  }
  return formatAppVersion(base || "unknown", env.RENDER_GIT_COMMIT);
}
