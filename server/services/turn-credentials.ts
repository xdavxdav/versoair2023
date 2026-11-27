export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallConfig {
  enabled: boolean;
  relay: boolean;
  iceServers: IceServer[];
}

const STUN_ONLY: IceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];
const TTL_SECONDS = 3600;

export const callsEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.CALLS_ENABLED === "true";

/**
 * Short-lived Cloudflare TURN credentials for one caller. The long-term key and
 * its API token stay on the server. Without them calls fall back to STUN only,
 * which works on many networks but not behind strict mobile NATs.
 */
export async function getCallConfig(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<CallConfig> {
  if (!callsEnabled(env)) return { enabled: false, relay: false, iceServers: [] };

  const keyId = env.CLOUDFLARE_TURN_KEY_ID;
  const token = env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) {
    return { enabled: true, relay: false, iceServers: STUN_ONLY };
  }

  try {
    const response = await fetcher(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error(`status ${response.status}`);
    const body = (await response.json()) as { iceServers?: IceServer[] };
    if (!Array.isArray(body.iceServers) || body.iceServers.length === 0) {
      throw new Error("no ice servers");
    }
    // Port 53 is blocked by browsers and only delays ICE without trickle.
    const iceServers = body.iceServers.map((server) => ({
      ...server,
      urls: ([] as string[])
        .concat(server.urls)
        .filter((url) => !/:53(\?|$)/.test(url)),
    }));
    return { enabled: true, relay: true, iceServers };
  } catch (error) {
    console.error("[Calls] TURN credentials unavailable", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return { enabled: true, relay: false, iceServers: STUN_ONLY };
  }
}
