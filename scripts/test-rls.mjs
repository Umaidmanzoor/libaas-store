const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Supabase URL and publishable key required");
let failed = false;
for (const table of ["categories", "products", "orders", "subscribers", "messages", "variants"]) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const publicTable = table === "categories" || table === "products";
  const pass = publicTable ? response.ok : response.status === 401 || response.status === 403;
  console.log(`${table}: ${response.status} ${pass ? "PASS" : "FAIL"}`);
  if (!pass) failed = true;
}
if (failed) process.exitCode = 1;
