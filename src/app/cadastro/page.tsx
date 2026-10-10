import { createAdminClient } from "@/lib/supabase/admin";
import { CadastroForm } from "./CadastroForm";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  const admin = createAdminClient();
  const [{ data: profs }, { data: taken }] = await Promise.all([
    admin.from("professionals").select("id,name").order("name"),
    admin.from("members").select("professional_id").not("professional_id", "is", null),
  ]);
  const takenIds = new Set((taken ?? []).map((t) => t.professional_id as string));
  const available = (profs ?? []).filter((p) => !takenIds.has(p.id));
  return <CadastroForm available={available} />;
}
