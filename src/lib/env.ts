import "server-only";
import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: optional(z.url()),
  NEXT_PUBLIC_SUPABASE_URL: optional(z.url()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional(z.string().min(1)),
  SUPABASE_SECRET_KEY: optional(z.string().min(1)),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: optional(z.string().regex(/^rzp_(test|live)_/)),
  RAZORPAY_KEY_SECRET: optional(z.string().min(1)),
  RAZORPAY_WEBHOOK_SECRET: optional(z.string().min(1)),
  RESEND_API_KEY: optional(z.string().min(1)),
  EMAIL_FROM: optional(z.string().min(1)),
  OWNER_EMAIL: optional(z.email()),
  ADMIN_EMAIL: optional(z.email()),
  ALLOW_LIVE_PAYMENTS: z.preprocess(value=>value===""?undefined:value,z.enum(["true", "false"]).default("false")),
});
export function getEnv() {
  const result = schema.safeParse(process.env);
  // Never print the Zod error: it can contain private input values.
  return result.success ? result.data : null;
}
export function backendConfigured() {
  const env = getEnv();
  return !!(env?.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && env.SUPABASE_SECRET_KEY);
}
export function assertTestPayments() {
  const env = getEnv();
  if (!env?.NEXT_PUBLIC_RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET ||
    (env.NEXT_PUBLIC_RAZORPAY_KEY_ID.startsWith("rzp_live_") && env.ALLOW_LIVE_PAYMENTS !== "true")) {
    throw new Error("Payments are not configured yet.");
  }
  return env;
}
