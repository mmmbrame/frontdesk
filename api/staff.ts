import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ServerResponse } from "node:http";
import { addStaff } from "../server/additions.js";
import { readJson, sendJson, type ApiRequest } from "../server/http.js";

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method === "POST") {
    try {
      const person = await addStaff(await readJson(req));
      return sendJson(res, 201, { person });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The staff member could not be added.";
      const status = message.startsWith("Enter") || message.startsWith("The staff list") ? 400 : 500;
      return sendJson(res, status, { error: message });
    }
  }
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
