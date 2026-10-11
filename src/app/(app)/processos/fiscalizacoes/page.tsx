import { requireMember } from "@/lib/auth";
import { UserRecords } from "@/components/UserRecords";

export default async function Page() {
  const me = await requireMember();
  return <UserRecords id={me.id} view="formularios" only="fiscalizacoes" />;
}
