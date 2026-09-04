import { handleJobIntentRequest } from "./job-intent-handler";

export async function POST(req: Request): Promise<Response> {
  return handleJobIntentRequest(req);
}
