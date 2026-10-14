import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiRequest = IncomingMessage & { body?: unknown };

// Reads a JSON body. Vercel may already parse it into req.body; the dev server does not.
export async function readJson(req: ApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}
