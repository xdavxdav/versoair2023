import { createHash, randomUUID } from "node:crypto";
import Redis from "ioredis";
import {
  PUBLIC_COPY,
  SUPPORTED_LANGUAGES,
  nativeDictionary,
  type TranslationDictionary,
} from "../../shared/public-translations";

export class TranslationError extends Error {
  constructor(public readonly code: string, public readonly status = 503) {
    super(code);
  }
}

export interface TranslationStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  lock(key: string, token: string): Promise<boolean>;
  unlock(key: string, token: string): Promise<void>;
  reserve(key: string, characters: number, limit: number): Promise<boolean>;
}

const version = createHash("sha256").update(JSON.stringify(PUBLIC_COPY)).digest("hex").slice(0, 16);

function validateDictionary(value: unknown): TranslationDictionary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TranslationError("TRANSLATION_INVALID_RESPONSE");
  }
  const dictionary: TranslationDictionary = {};
  for (let index = 0; index < PUBLIC_COPY.length; index++) {
    const text = Reflect.get(value, String(index));
    if (typeof text !== "string" || !text.trim() || text.length > 20_000) {
      throw new TranslationError("TRANSLATION_INVALID_RESPONSE");
    }
    dictionary[String(index)] = text;
  }
  return dictionary;
}

export class PublicTranslationService {
  private pending = new Map<string, Promise<TranslationDictionary>>();

  constructor(
    private readonly store: TranslationStore,
    private readonly apiKey: string,
    private readonly monthlyLimit: number,
    private readonly request: typeof fetch = fetch,
  ) {}

  async translate(language: string): Promise<TranslationDictionary> {
    if (!SUPPORTED_LANGUAGES.has(language)) {
      throw new TranslationError("TRANSLATION_UNSUPPORTED_LANGUAGE", 400);
    }
    if (language === "fr" || language === "en") return nativeDictionary(language);
    const existing = this.pending.get(language);
    if (existing) return existing;
    const pending = this.load(language);
    this.pending.set(language, pending);
    try {
      return await pending;
    } finally {
      this.pending.delete(language);
    }
  }

  private async load(language: string): Promise<TranslationDictionary> {
    const key = `translation:${version}:${language}`;
    const cached = await this.store.get(key);
    if (cached !== null) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(cached);
      } catch {
        throw new TranslationError("TRANSLATION_INVALID_CACHE");
      }
      return validateDictionary(parsed);
    }
    const lock = `${key}:lock`;
    const token = randomUUID();
    if (!(await this.store.lock(lock, token))) {
      throw new TranslationError("TRANSLATION_BUSY");
    }
    try {
      // Another instance may have populated the cache between GET and SET NX.
      const populated = await this.store.get(key);
      if (populated !== null) return validateDictionary(JSON.parse(populated));
      const source = PUBLIC_COPY.map(([, fr]) => fr);
      const characters = source.reduce((sum, text) => sum + Array.from(text).length, 0);
      const month = new Date().toISOString().slice(0, 7);
      if (!(await this.store.reserve(`translation:usage:${month}`, characters, this.monthlyLimit))) {
        throw new TranslationError("TRANSLATION_BUDGET_EXCEEDED");
      }
      const dictionary: TranslationDictionary = {};
      for (let offset = 0; offset < source.length; offset += 128) {
        const batch = source.slice(offset, offset + 128);
        let response: Response;
        try {
          response = await this.request("https://translation.googleapis.com/language/translate/v2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey },
            body: JSON.stringify({ q: batch, source: "fr", target: language, format: "text" }),
            signal: AbortSignal.timeout(10_000),
          });
        } catch {
          throw new TranslationError("TRANSLATION_PROVIDER_UNAVAILABLE");
        }
        if (!response.ok) throw new TranslationError("TRANSLATION_PROVIDER_UNAVAILABLE");
        const payload: unknown = await response.json();
        const data = payload && typeof payload === "object" ? Reflect.get(payload, "data") : null;
        const translations: unknown = data && typeof data === "object" ? Reflect.get(data, "translations") : null;
        if (!Array.isArray(translations) || translations.length !== batch.length) {
          throw new TranslationError("TRANSLATION_INVALID_RESPONSE");
        }
        translations.forEach((item: unknown, index: number) => {
          const text = item && typeof item === "object" ? Reflect.get(item, "translatedText") : null;
          if (typeof text !== "string" || !text.trim() || text.length > 20_000) {
            throw new TranslationError("TRANSLATION_INVALID_RESPONSE");
          }
          dictionary[String(offset + index)] = text;
        });
      }
      await this.store.put(key, JSON.stringify(dictionary));
      return dictionary;
    } finally {
      await this.store.unlock(lock, token);
    }
  }
}

function redisStore(url: string): TranslationStore {
  const redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });
  redis.on("error", () => console.error("[Translation] Persistent cache unavailable"));
  let connecting: Promise<void> | null = null;
  const ready = async () => {
    if (redis.status === "wait" || redis.status === "end") {
      connecting ??= redis.connect().finally(() => { connecting = null; });
    }
    if (connecting) await connecting;
    if (redis.status !== "ready") throw new TranslationError("TRANSLATION_CACHE_UNAVAILABLE");
  };
  return {
    async get(key) {
      await ready();
      return redis.get(key);
    },
    async put(key, value) {
      await redis.set(key, value, "EX", 30 * 24 * 3600);
    },
    async lock(key, token) {
      return (await redis.set(key, token, "EX", 120, "NX")) === "OK";
    },
    async unlock(key, token) {
      await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
        1, key, token,
      );
    },
    async reserve(key, characters, limit) {
      const result = await redis.eval(
        "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n+tonumber(ARGV[1])>tonumber(ARGV[2]) then return 0 end; redis.call('INCRBY',KEYS[1],ARGV[1]); redis.call('EXPIRE',KEYS[1],3456000); return 1",
        1, key, characters, limit,
      );
      return result === 1;
    },
  };
}

let service: PublicTranslationService | undefined;

export function getPublicTranslationService(): PublicTranslationService {
  if (process.env.CLOUD_TRANSLATION_ENABLED !== "true") {
    throw new TranslationError("TRANSLATION_NOT_CONFIGURED");
  }
  const key = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
  const redisUrl = process.env.REDIS_URL;
  const rawLimit = process.env.TRANSLATION_MONTHLY_CHARACTER_LIMIT ?? "";
  const limit = Number(rawLimit);
  if (!key || !redisUrl || !/^[1-9]\d*$/.test(rawLimit) || !Number.isSafeInteger(limit)) {
    throw new TranslationError("TRANSLATION_NOT_CONFIGURED");
  }
  service ??= new PublicTranslationService(redisStore(redisUrl), key, limit);
  return service;
}
