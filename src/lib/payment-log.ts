import "server-only";

/** Log diagnostic categories, never request bodies, tokens or provider messages. */
export function paymentLog(stage: string, code?: string, status?: number) {
  console.error("[checkout]", {stage, code: code && /^[A-Z0-9_]{1,32}$/i.test(code) ? code : "unavailable", ...(status ? {status} : {})});
}
