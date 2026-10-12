"use server";
import JSZip from "jszip";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_BUCKET, markersOf } from "@/lib/report";
import { cleanBlocks, cleanComments, parseDocx, serializeDocx, type DocData } from "@/lib/docxDoc";
import { MODELS, knownMarkers, readInfoFile, writeInfoFile, type ModelKind } from "@/lib/models";
import { FORM_KEY } from "@/lib/forms";
import { INICIAL_TYPES, cleanSections, storeSections } from "@/lib/questionnaires";

// Troca o arquivo-base de um tipo de relatório (só o administrador). A versão anterior fica guardada.
export async function replaceModel(_: string | null, form: FormData): Promise<string> {
  const me = await requireAdmin();
  const kind = String(form.get("kind")) as ModelKind;
  if (!(kind in MODELS)) return "Tipo de modelo inválido.";
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return "Escolha o arquivo .docx.";
  if (!file.name.toLowerCase().endsWith(".docx")) return "O modelo precisa ser um arquivo .docx (Word).";
  if (file.size > 8 * 1024 * 1024) return "Arquivo muito grande (limite de 8 MB).";

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const zip = await JSZip.loadAsync(buf);
    if (!zip.file("word/document.xml")) throw new Error();
  } catch { return "Não consegui ler esse arquivo. Salve-o como .docx pelo Word e tente de novo."; }

  const known = knownMarkers(kind);
  let aviso = "";
  if (known.length) {
    let found: string[] = [];
    try { found = await markersOf(buf); } catch { /* já validado acima */ }
    if (found.length === 0) return "O documento não tem nenhum campo {{ASSIM}}. Mantenha os campos entre chaves duplas.";
    const unknown = found.filter((m) => !known.includes(m));
    if (unknown.length) aviso = ` Atenção: campos que o sistema não conhece (vão aparecer escritos): ${unknown.map((m) => `{{${m}}}`).join(", ")}.`;
  }

  const st = createAdminClient().storage.from(REPORT_BUCKET);
  const path = MODELS[kind].path;
  const { data: old } = await st.download(path);
  if (old) {
    await st.upload(`anteriores/${kind}-${new Date().toISOString().replace(/[:.]/g, "-")}.docx`, Buffer.from(await old.arrayBuffer()), { contentType: "application/octet-stream" });
  }
  const up = await st.upload(path, buf, { upsert: true, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  if (up.error) return "Não foi possível salvar o modelo. Tente de novo.";
  if (kind === "inicial") await st.remove(["relatorio-config.json"]); // as edições por parágrafo eram do arquivo antigo

  const info = await readInfoFile();
  info[kind] = { original: file.name, at: new Date().toISOString(), by: me.name || me.email };
  await writeInfoFile(info);
  revalidatePath("/cadastro-inicial"); revalidatePath("/acompanhamento"); revalidatePath("/fiscalizacoes");
  return `ok:Modelo atualizado. Os próximos relatórios usam este arquivo (os já criados não mudam; use “Refazer” dentro do relatório para aplicar).${aviso}`;
}

// Documento-modelo para mostrar em leitura (somente administrador).
export async function getModelDoc(kind: ModelKind): Promise<DocData | null> {
  await requireAdmin();
  if (!(kind in MODELS)) return null;
  const { data } = await createAdminClient().storage.from(REPORT_BUCKET).download(MODELS[kind].path);
  if (!data) return null;
  return parseDocx(Buffer.from(await data.arrayBuffer()));
}

// Salva o modelo editado na própria tela (só administrador). A versão anterior fica guardada.
export async function saveModelDoc(
  kind: ModelKind, payload: unknown,
): Promise<{ ok: boolean; msg: string; version?: string }> {
  const me = await requireAdmin();
  if (!(kind in MODELS)) return { ok: false, msg: "Tipo de modelo inválido." };
  const pl = (payload && typeof payload === "object" ? payload : {}) as { blocks?: unknown; comments?: unknown; page?: Record<string, number> };
  const blocks = cleanBlocks(pl.blocks);
  if (!blocks) return { ok: false, msg: "Documento inválido." };
  const mar = (v: unknown) => (typeof v === "number" && v >= 24 && v <= 240 ? v : undefined);
  const pg = pl.page ?? {};

  const st = createAdminClient().storage.from(REPORT_BUCKET);
  const path = MODELS[kind].path;
  const { data: old } = await st.download(path);
  if (!old) return { ok: false, msg: "Nenhum arquivo-base enviado ainda. Use “Enviar modelo”." };
  const oldBuf = Buffer.from(await old.arrayBuffer());
  await st.upload(`anteriores/${kind}-${new Date().toISOString().replace(/[:.]/g, "-")}.docx`, oldBuf, { contentType: "application/octet-stream" });

  const buf = await serializeDocx(oldBuf, blocks, {
    comments: cleanComments(pl.comments),
    page: { top: mar(pg.top), bottom: mar(pg.bottom), left: mar(pg.left), right: mar(pg.right) },
  });
  const up = await st.upload(path, buf, { upsert: true, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  if (up.error) return { ok: false, msg: "Não foi possível salvar o modelo. Tente de novo." };
  if (kind === "inicial") await st.remove(["relatorio-config.json"]);

  const info = await readInfoFile();
  info[kind] = { original: info[kind]?.original || MODELS[kind].file, at: new Date().toISOString(), by: me.name || me.email };
  await writeInfoFile(info);
  revalidatePath("/cadastro-inicial"); revalidatePath("/acompanhamento"); revalidatePath("/fiscalizacoes");
  return { ok: true, msg: "Modelo salvo. Os próximos relatórios usam esta versão." };
}

// Salva o questionário editado (somente administrador): Acompanhamento e Fiscalizações ficam em arquivo;
// o Cadastro inicial atualiza a tabela de perguntas.
export async function saveQuestionnaire(kind: ModelKind, input: unknown): Promise<{ ok: boolean; msg: string }> {
  await requireAdmin();
  const sections = cleanSections(input);
  if (!sections || sections.every((s) => s.questions.length === 0)) {
    return { ok: false, msg: "O questionário precisa ter pelo menos uma pergunta." };
  }

  if (kind === "inicial") {
    const admin = createAdminClient();
    const { data: existing } = await admin.from("form_questions").select("id, key").eq("form_key", FORM_KEY).is("owner_id", null);
    const byKey = new Map((existing ?? []).map((r) => [r.key as string, r.id as string]));
    const kept = new Set<string>();
    let n = 0;
    for (const sec of sections) {
      for (const q of sec.questions) {
        n++;
        kept.add(q.key);
        const t = INICIAL_TYPES.includes(q.type) ? q.type : "text";
        const row = {
          form_key: FORM_KEY, key: q.key, position: n * 10, section: sec.title, label: q.label, help: q.help ?? "",
          type: t === "radio" && q.other ? "radio_other" : t,
          options: ["select", "radio", "checkbox"].includes(t) ? [...(q.options ?? []), ...(t === "checkbox" && q.other ? ["Outro"] : [])] : [],
          required: !!q.required, active: true,
        };
        const id = byKey.get(q.key);
        const r = id ? await admin.from("form_questions").update(row).eq("id", id) : await admin.from("form_questions").insert(row);
        if (r.error) return { ok: false, msg: "Não foi possível salvar o questionário. Tente de novo." };
      }
    }
    const gone = [...byKey.entries()].filter(([k]) => !kept.has(k)).map(([, id]) => id);
    if (gone.length) await admin.from("form_questions").delete().in("id", gone);
  } else {
    // a lista de profissionais vem do cadastro de pessoas, não do questionário
    for (const sec of sections) for (const q of sec.questions) if (q.key === "prof") q.options = [];
    const r = await storeSections(kind, sections);
    if (r.error) return { ok: false, msg: "Não foi possível salvar o questionário. Tente de novo." };
  }
  revalidatePath("/cadastro-inicial"); revalidatePath("/acompanhamento"); revalidatePath("/fiscalizacoes");
  return { ok: true, msg: "Questionário salvo. Já vale para os próximos preenchimentos." };
}
