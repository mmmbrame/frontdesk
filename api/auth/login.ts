import type { ServerResponse } from "node:http";
import { checkCredentials, createSessionToken, sessionCookie } from "../../server/session.js";
import { readJson, sendJson, type ApiRequest } from "../../server/http.js";

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    const body = await readJson(req);
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) return sendJson(res, 400, { error: "Enter your username and password." });
    if (!checkCredentials(username, password)) return sendJson(res, 401, { error: "Wrong username or password." });
    const token = createSessionToken(username);
    return sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(token, 60 * 60 * 12) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed.";
    return sendJson(res, 500, { error: message });
  }
}
