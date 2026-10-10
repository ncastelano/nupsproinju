import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { UserRecords } from "@/components/UserRecords";

// Página de outra pessoa (administrador). A própria pessoa usa Formulários / Acompanhamentos.
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  if (id === me.id) redirect("/formularios");
  return <UserRecords id={id} view="todos" />;
}
