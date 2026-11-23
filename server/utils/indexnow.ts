import type { Request, Response } from "express";

// IndexNow lets us notify Bing (and Yandex, Seznam, DuckDuckGo, and the Bing-backed
// AI answerers) that URLs exist or changed, with no account — the only proof of
// ownership is hosting this key as a text file at the site root. The key is public
// by design, so it is safe to keep in source.
export const INDEXNOW_KEY = "8f50d7fc0cae7f60e08a7597a5586049";

export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;

export function indexNowKeyHandler(_req: Request, res: Response) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(INDEXNOW_KEY);
}

export type IndexNowSubmission = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

/** Build the JSON body IndexNow expects. `origin` is like "https://www.versoair.com". */
export function buildIndexNowSubmission(
  origin: string,
  urls: string[],
): IndexNowSubmission {
  const host = new URL(origin).host;
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}${INDEXNOW_KEY_PATH}`,
    urlList: urls,
  };
}
