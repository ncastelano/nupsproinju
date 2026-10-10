import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";

// A lista de cadastrados agora vive em "Meus formulários".
export default async function CadastradosPage() {
  const me = await requireMember();
  redirect(`/usuarios/${me.id}`);
}
