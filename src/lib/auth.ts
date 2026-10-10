import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Member = { id: string; email: string; name: string; role: "admin" | "member"; active: boolean };

export async function getMember(): Promise<Member | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle();
  return data && data.active ? (data as Member) : null;
}

export async function requireMember() {
  const m = await getMember();
  if (!m) redirect("/login");
  return m;
}

export async function requireAdmin() {
  const m = await requireMember();
  if (m.role !== "admin") redirect("/");
  return m;
}
