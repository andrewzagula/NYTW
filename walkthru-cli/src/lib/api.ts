export const WALKTHRU_API = process.env.WALKTHRU_API ?? "https://walkthru.dev/api";

export async function apiPost<T>(path: string, token: string | undefined, body: unknown): Promise<T | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${WALKTHRU_API}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}
