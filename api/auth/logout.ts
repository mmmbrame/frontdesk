import type { ServerResponse } from "node:http";
import { sessionCookie } from "../../server/session.js";
import { sendJson } from "../../server/http.js";

export default function handler(_req: unknown, res: ServerResponse) {
  sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
}
