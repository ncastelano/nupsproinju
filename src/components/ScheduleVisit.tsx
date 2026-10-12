"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import { scheduleVisit } from "@/app/(app)/fiscalizacoes/actions";
import { UNIDADES } from "@/lib/fisc";
import { ChoiceField } from "@/components/ChoiceField";

// Agendar uma visita de fiscalização (unidade, data e profissionais).
export function ScheduleVisit({ people, me }: { people: string[]; me: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, action, pending] = useActionState(scheduleVisit, null);

  useEffect(() => {
    if (msg === "ok") { setOpen(false); router.refresh(); }
  }, [msg, router]);

  if (!open) return <button onClick={() => setOpen(true)}><CalendarPlus size={16} /> Agendar visita</button>;
  return (
    <form action={action} className="card grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Agendar visita</h2>
        <button type="button" className="ghost icon" aria-label="Fechar" onClick={() => setOpen(false)}><X size={16} /></button>
      </div>
      <label className="field">
        <span>Unidade a fiscalizar</span>
        <ChoiceField name="unit" title="Unidade a fiscalizar" options={UNIDADES} />
      </label>
      <label className="field">
        <span>Data da visita</span>
        <input type="date" name="date" required />
      </label>
      <div className="field">
        <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>Profissional(is) responsável(is)</span>
        <ChoiceField name="professionals" title="Profissional(is) responsável(is)" multiple options={people} initial={people.includes(me) ? [me] : []} placeholder="Selecione os profissionais..." />
      </div>
      {msg && msg !== "ok" && <p className="error">{msg}</p>}
      <div className="row">
        <button disabled={pending}>{pending ? "Agendando..." : "Agendar"}</button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
