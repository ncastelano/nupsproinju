import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";

// A lista agora vive em Formulários.
export default async function CadastradosPage() {
  await requireMember();
  redirect("/formularios");
}
