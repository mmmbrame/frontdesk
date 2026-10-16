import type { ServerResponse } from "node:http";
import { loadAdditions } from "../server/additions.js";
import { sendJson, type ApiRequest } from "../server/http.js";

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "Use GET." });
  }
  try {
    return sendJson(res, 200, await loadAdditions());
  } catch {
    return sendJson(res, 500, { error: "Added records could not be read." });
  }
}
