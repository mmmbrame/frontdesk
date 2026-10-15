import type { IncomingMessage, ServerResponse } from "node:http";
import { readSession } from "../../server/session.js";
import { sendJson } from "../../server/http.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const session = readSession(req.headers.cookie);
  sendJson(res, 200, { authenticated: Boolean(session), user: session?.user ?? null });
}
