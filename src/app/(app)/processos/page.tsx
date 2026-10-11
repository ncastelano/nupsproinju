import { requireMember } from "@/lib/auth";
import { UserRecords } from "@/components/UserRecords";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireMember();
  const { q } = await searchParams;
  return <UserRecords id={me.id} view="formularios" q={q ?? ""} />;
}
