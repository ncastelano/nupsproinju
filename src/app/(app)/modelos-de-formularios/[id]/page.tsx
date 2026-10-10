import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEYS, FORM_TITLE, type Question } from "@/lib/forms";
import { emptyDelta, findTemplate } from "@/lib/templates";
import { useTemplate } from "../../formulario/custom-actions";

export default async function ModeloPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const tpl = await findTemplate(id);
  if (!tpl) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("form_questions").select("*").eq("active", true).order("position");
  const model = ((data ?? []) as Question[]).filter((q) => !q.owner_id);

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href="/modelos-de-formularios" className="row"><ArrowLeft size={16} /> Voltar aos modelos</Link>
      <section className="hero">
        <h1 style={{ fontSize: 24 }}>{tpl.name}</h1>
        <p>de {tpl.owner_name}{tpl.parent_name ? ` · a partir de ${tpl.parent_name}` : ""}</p>
      </section>
      <form action={useTemplate}>
        <input type="hidden" name="id" value={tpl.id} />
        <button>Usar este formulário</button>
      </form>

      {FORM_KEYS.map((fk) => {
        const delta = tpl.forms[fk] ?? emptyDelta();
        const list: (Question & { tag?: string })[] = [
          ...model.filter((q) => q.form_key === fk).map((q) =>
            delta.overrides[q.key] ? { ...q, ...delta.overrides[q.key], tag: "ajustada" } : q),
          ...delta.questions.map((q) => ({ ...q, tag: "acrescentada" })),
        ];
        let last = "";
        return (
          <div key={fk} className="card grid" style={{ gap: 10 }}>
            <h2 style={{ margin: 0 }}>{FORM_TITLE[fk]}</h2>
            {list.map((q) => {
              const head = q.section && q.section !== last ? q.section : null;
              last = q.section || last;
              return (
                <div key={q.key}>
                  {head && <h3 className="section" style={{ margin: "10px 0 6px" }}>{head}</h3>}
                  <div className="ans">
                    <div className="ans-q">
                      {q.label}{q.required ? " *" : ""}{" "}
                      {q.tag && <span className="badge">{q.tag}</span>}
                    </div>
                    {q.help && <div className="help">{q.help}</div>}
                    {q.options.length > 0 && <div className="ans-a" style={{ fontWeight: 400 }}>{q.options.join(" · ")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
