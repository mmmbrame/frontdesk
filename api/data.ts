import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readSession } from "../server/session.js";
import { sendJson } from "../server/http.js";

// The student file lives in private/ (not public/), so it is only reachable through this function.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!readSession(req.headers.cookie)) return sendJson(res, 401, { error: "Sign in to view the atlas." });
  try {
    const file = await readFile(path.join(process.cwd(), "private", "data.json"));
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.end(file);
  } catch {
    return sendJson(res, 500, { error: "The student file could not be read on the server." });
  }
}
