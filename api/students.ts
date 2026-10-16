import type { ServerResponse } from "node:http";
import { addStudent } from "../server/additions.js";
import { readJson, sendJson, type ApiRequest } from "../server/http.js";

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    const student = await addStudent(await readJson(req));
    return sendJson(res, 201, { student });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The student could not be added.";
    const status = message.startsWith("Enter") || message.startsWith("The student list") ? 400 : 500;
    return sendJson(res, status, { error: message });
  }
}
