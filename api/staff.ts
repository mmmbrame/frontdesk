import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ServerResponse } from "node:http";
import { sendJson } from "../server/http.js";

export default async function handler(_req: unknown, res: ServerResponse) {
  try {
    const file = await readFile(path.join(process.cwd(), "private", "staff.json"));
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.end(file);
  } catch {
    return sendJson(res, 500, { error: "The staff file could not be read on the server." });
  }
}
