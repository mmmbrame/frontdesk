import type { ServerResponse } from "node:http";
import { sessionCookie } from "../../server/session";
import { sendJson } from "../../server/http";

export default function handler(_req: unknown, res: ServerResponse) {
  sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
}
