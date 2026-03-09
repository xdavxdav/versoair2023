import { pool } from "../db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessRecord {
  name: string;
  category: string;
  city: string;
  country: string;
  description: string;
  source: string;
}

export interface ConnectorStatus {
  name: string;
  lastRun: Date | null;
  recordsIngested: number;
  status: "idle" | "running" | "success" | "error";
  error?: string;
}

/**
 * DataConnector interface — every data source implements this.
 * Connectors are pluggable modules that fetch data from external sources
 * and normalize it into BusinessRecord format for unified ingestion.
 */
export interface DataConnector {
  name: string;
  fetch(): Promise<BusinessRecord[]>;
}

// ─── Connector Registry ───────────────────────────────────────────────────────

const connectorStatuses: Map<string, ConnectorStatus> = new Map();

export function getConnectorStatuses(): ConnectorStatus[] {
  return Array.from(connectorStatuses.values());
}

// ─── CSV Connector ────────────────────────────────────────────────────────────

/**
 * Ingests business data from a CSV file.
 * Expected columns: name, category, city, country, description
 */
export class CsvConnector implements DataConnector {
  name: string;

  constructor(
    private filePath: string,
    name?: string,
  ) {
    this.name = name ?? `csv:${filePath}`;
  }

  async fetch(): Promise<BusinessRecord[]> {
    const fs = await import("fs/promises");

    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const lines = content.split("\n");
      const header = lines[0]?.toLowerCase() ?? "";

      // Auto-detect delimiter
      const delimiter = header.includes("\t")
        ? "\t"
        : header.includes(";")
          ? ";"
          : ",";

      const headers = header.split(delimiter).map((h) => h.trim());
      const nameIdx = headers.findIndex((h) =>
        /^(name|nom|business_name|business|raison_sociale)$/.test(h),
      );
      const catIdx = headers.findIndex((h) =>
        /^(category|categorie|sector|secteur|type)$/.test(h),
      );
      const cityIdx = headers.findIndex((h) =>
        /^(city|ville|location|lieu)$/.test(h),
      );
      const countryIdx = headers.findIndex((h) =>
        /^(country|pays|nation)$/.test(h),
      );
      const descIdx = headers.findIndex((h) =>
        /^(description|desc|about|details)$/.test(h),
      );

      if (nameIdx === -1) {
        throw new Error(
          `CSV file "${this.filePath}" is missing a required 'name' column`,
        );
      }

      const records: BusinessRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        const cols = line.split(delimiter).map((c) => c.trim());
        const name = cols[nameIdx];
        if (!name) continue;

        records.push({
          name,
          category: catIdx >= 0 ? (cols[catIdx] ?? "") : "",
          city: cityIdx >= 0 ? (cols[cityIdx] ?? "") : "",
          country: countryIdx >= 0 ? (cols[countryIdx] ?? "") : "",
          description: descIdx >= 0 ? (cols[descIdx] ?? "") : "",
          source: this.name,
        });
      }

      return records;
    } catch (err: any) {
      throw new Error(
        `CSV Connector "${this.name}" failed: ${err?.message ?? err}`,
      );
    }
  }
}

// ─── API Connector ────────────────────────────────────────────────────────────

/**
 * Ingests business data from an external REST API.
 * The API should return JSON with an array of business objects.
 */
export class ApiConnector implements DataConnector {
  name: string;

  constructor(
    private apiUrl: string,
    private options: {
      name?: string;
      headers?: Record<string, string>;
      resultsPath?: string; // JSONPath-like dot notation: "data.results"
      fieldMap?: Partial<Record<keyof BusinessRecord, string>>; // map API fields to our fields
    } = {},
  ) {
    this.name = options.name ?? `api:${new URL(apiUrl).hostname}`;
  }

  async fetch(): Promise<BusinessRecord[]> {
    try {
      const response = await fetch(this.apiUrl, {
        headers: {
          Accept: "application/json",
          ...this.options.headers,
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      let data = await response.json();

      // Navigate to the results array via dot-notation path
      if (this.options.resultsPath) {
        for (const key of this.options.resultsPath.split(".")) {
          data = data?.[key];
        }
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "API response is not an array (use resultsPath to specify the array location)",
        );
      }

      const fm = this.options.fieldMap ?? {};

      return data.map((item: any) => ({
        name: String(item[fm.name ?? "name"] ?? ""),
        category: String(item[fm.category ?? "category"] ?? item.type ?? ""),
        city: String(item[fm.city ?? "city"] ?? item.location?.city ?? ""),
        country: String(
          item[fm.country ?? "country"] ?? item.location?.country ?? "",
        ),
        description: String(
          item[fm.description ?? "description"] ?? item.summary ?? "",
        ),
        source: this.name,
      }));
    } catch (err: any) {
      throw new Error(
        `API Connector "${this.name}" failed: ${err?.message ?? err}`,
      );
    }
  }
}

// ─── Unified Ingestion Pipeline ───────────────────────────────────────────────

/**
 * Ingests data from a connector into the businesses table.
 * Uses INSERT ... ON CONFLICT to upsert (update if name+city match).
 * Tracks connector status for monitoring.
 */
export async function ingestData(
  connector: DataConnector,
): Promise<{ ingested: number; errors: number }> {
  const status: ConnectorStatus = {
    name: connector.name,
    lastRun: new Date(),
    recordsIngested: 0,
    status: "running",
  };
  connectorStatuses.set(connector.name, status);

  console.log(`[DataConnector] Starting ingestion from: ${connector.name}`);

  let ingested = 0;
  let errors = 0;

  try {
    const records = await connector.fetch();

    for (const record of records) {
      if (!record.name?.trim()) {
        errors++;
        continue;
      }

      try {
        // Upsert: insert new or update existing (match on name + source)
        await pool.query(
          `INSERT INTO businesses (name, description, location, source, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (name) DO UPDATE SET
             description = COALESCE(NULLIF(EXCLUDED.description, ''), businesses.description),
             location = COALESCE(NULLIF(EXCLUDED.location, ''), businesses.location),
             source = EXCLUDED.source,
             updated_at = NOW()
           WHERE businesses.source = $4 OR businesses.source IS NULL`,
          [
            record.name.trim(),
            record.description?.trim() || null,
            record.city?.trim() || null,
            record.source,
          ],
        );
        ingested++;
      } catch (err: any) {
        errors++;
        if (ingested === 0 && errors <= 3) {
          console.warn(
            `[DataConnector] Row error in ${connector.name}:`,
            err?.message,
          );
        }
      }
    }

    status.recordsIngested = ingested;
    status.status = "success";
    console.log(
      `[DataConnector] ${connector.name}: ${ingested} ingested, ${errors} errors`,
    );
  } catch (err: any) {
    status.status = "error";
    status.error = err?.message ?? String(err);
    console.error(`[DataConnector] ${connector.name} failed:`, err?.message);
  }

  connectorStatuses.set(connector.name, status);
  return { ingested, errors };
}

// ─── Run All Registered Connectors ────────────────────────────────────────────

const registeredConnectors: DataConnector[] = [];

/**
 * Register a connector for automatic ingestion.
 * Registered connectors can be run on-demand or scheduled.
 */
export function registerConnector(connector: DataConnector): void {
  registeredConnectors.push(connector);
  connectorStatuses.set(connector.name, {
    name: connector.name,
    lastRun: null,
    recordsIngested: 0,
    status: "idle",
  });
  console.log(`[DataConnector] Registered: ${connector.name}`);
}

/**
 * Run all registered connectors sequentially.
 */
export async function runAllConnectors(): Promise<{
  total: number;
  results: { name: string; ingested: number; errors: number }[];
}> {
  const results: { name: string; ingested: number; errors: number }[] = [];

  for (const connector of registeredConnectors) {
    const result = await ingestData(connector);
    results.push({
      name: connector.name,
      ingested: result.ingested,
      errors: result.errors,
    });
  }

  return {
    total: results.reduce((sum, r) => sum + r.ingested, 0),
    results,
  };
}
