// Uso: npm run create-admin -- email@exemplo.com senha "Nome"
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}
const [email, password, name = ""] = process.argv.slice(2);
if (!email || !password) { console.error("uso: npm run create-admin -- email senha [nome]"); process.exit(1); }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const { error: e2 } = await admin.from("members").insert({ id: data.user.id, email, name, role: "admin" });
if (e2) throw e2;
console.log("admin criado:", email);
