import { requireMember } from "@/lib/auth";
import { ProcessList } from "@/components/ProcessList";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireMember();
  const { q } = await searchParams;
  void me;
  return <ProcessList q={q ?? ""} />;
}
