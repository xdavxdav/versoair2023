import { authenticatedFetch } from "@/lib/auth";

export async function ticketRequest<T>(path: string, method = "GET", body?: object): Promise<T> {
  const response = await authenticatedFetch(path, {
    method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : data.error?.message || "Support request failed");
  return data;
}
