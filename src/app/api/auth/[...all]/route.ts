import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// better-auth owns every /api/auth/* endpoint (sign-up, sign-in, sign-out,
// session).
export const { GET, POST } = toNextJsHandler(auth.handler);
