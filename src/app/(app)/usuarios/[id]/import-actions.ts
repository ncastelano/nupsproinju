"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, addDoc, ensureBucket, newDocId, removeDocMeta, findDoc, type DocMeta } from "@/lib/documents";
import { normLabel, readSheet } from "@/lib/importSheet";
import { FORM_KEY } from "@/lib/forms";

const MAX = 12 * 1024 * 1024;

// Só aceitamos links do Google Docs / Drive (evita buscar endereços arbitrários pelo servidor).
function googleExport(raw: string): { url: string; kind: "doc" | "file" } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const doc = u.pathname.match(/^\/document\/d\/([\w-]+)/);
  if (u.hostname === "docs.google.com" && doc) {
    return { url: `https://docs.google.com/document/d/${doc[1]}/export?format=docx`, kind: "doc" };
  }
  const file = u.pathname.match(/^\/file\/d\/([\w-]+)/) ?? (u.searchParams.get("id") ? [, u.searchParams.get("id")!] : null);
  if (u.hostname === "drive.google.com" && file?.[1]) {
    return { url: `https://drive.google.com/uc?export=download&id=${file[1]}`, kind: "file" };
  }
  return null;
}

async function extractText(buf: Buffer, ext: string): Promise<string> {
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const r = await parser.getText();
    await parser.destroy();
    return r.text;
  }
  return buf.toString("utf8"); // txt, md
}

const sniffExt = (name: string, type: string) => {
  const e = name.split(".").pop()?.toLowerCase() ?? "";
  if (["docx", "pdf", "txt", "md", "csv"].includes(e)) return e;
  if (type.includes("wordprocessingml")) return "docx";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("csv")) return "csv";
  if (type.startsWith("text/")) return "txt";
  return "";
};

export async function importProcess(_: string | null, form: FormData) {
  const me = await requireMember();
  const kind: DocMeta["kind"] = form.get("kind") === "acompanhamento" ? "acompanhamento" : "formulario";
  const link = String(form.get("url") ?? "").trim();
  const file = form.get("file");

  let buf: Buffer; let filename: string; let ext: string; let source: DocMeta["source"] = "arquivo"; let sourceUrl: string | undefined;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX) return "Arquivo muito grande (limite de 12 MB).";
    ext = sniffExt(file.name, file.type);
    if (!ext) return "Formato não aceito. Use .docx, .pdf ou .txt.";
    buf = Buffer.from(await file.arrayBuffer());
    filename = file.name;
  } else if (link) {
    const g = googleExport(link);
    if (!g) return "Cole um link do Google Docs (docs.google.com/document/…) ou do Google Drive.";
    const res = await fetch(g.url, { redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("text/html")) {
      return "Não consegui abrir esse documento: ele é privado. No Google Docs, em Compartilhar, deixe “Qualquer pessoa com o link” como leitor e tente de novo. Ou baixe como .docx (Arquivo → Fazer download) e arraste o arquivo aqui.";
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX) return "Arquivo muito grande (limite de 12 MB).";
    buf = bytes;
    ext = g.kind === "doc" ? "docx" : sniffExt("", type) || "pdf";
    const cd = res.headers.get("content-disposition") ?? "";
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    filename = m ? decodeURIComponent(m[1]) : `documento.${ext}`;
    source = "google"; sourceUrl = link;
  } else {
    return "Cole um link ou arraste um arquivo.";
  }

  // Planilha (CSV do Google Planilhas): cada linha vira um formulário (ou acompanhamento) de verdade.
  if (ext === "csv") return importSheet(me, buf.toString("utf8"), kind);

  let text: string;
  try { text = (await extractText(buf, ext)).replace(/\r\n/g, "\n").trim(); }
  catch { return "Não consegui ler o conteúdo desse arquivo."; }
  if (!text) return "O arquivo não tem texto legível (PDF escaneado?).";

  const id = newDocId();
  const admin = createAdminClient();
  await ensureBucket();
  const base = `${me.id}/${id}`;
  const up1 = await admin.storage.from(BUCKET).upload(`${base}.${ext}`, buf, { contentType: "application/octet-stream" });
  const up2 = await admin.storage.from(BUCKET).upload(`${base}.txt`, Buffer.from(text, "utf8"), { contentType: "text/plain; charset=utf-8" });
  if (up1.error || up2.error) return "Não foi possível guardar o arquivo no banco de dados.";

  const title = filename.replace(/\.(docx|pdf|txt|md|csv)$/i, "") || text.split("\n")[0].slice(0, 120);
  const r = await addDoc(me.id, {
    id, title, kind, source, source_url: sourceUrl, filename, ext, size: buf.length, chars: text.length,
    created_at: new Date().toISOString(), path_original: `${base}.${ext}`, path_text: `${base}.txt`,
  });
  if (r.error) return "Não foi possível registrar o processo.";
  revalidatePath("/usuarios", "layout");
  return "ok";
}

export async function deleteProcess(form: FormData) {
  const me = await requireMember();
  const found = await findDoc(String(form.get("id")));
  if (!found || (found.ownerId !== me.id && me.role !== "admin")) return;
  await createAdminClient().storage.from(BUCKET).remove([found.doc.path_original, found.doc.path_text]);
  await removeDocMeta(found.ownerId, found.doc.id);
  revalidatePath("/usuarios", "layout");
}

type Me = { id: string; name: string; email: string };

async function importSheet(me: Me, csv: string, kind: DocMeta["kind"]) {
  const admin = createAdminClient();
  const by = me.name || me.email;
  const stamp = new Date().toISOString();
  const entry = (scope: "formulario" | "acompanhamento", note: string) => ({
    at: stamp, by_id: me.id, by_name: by, scope, changes: [], note,
  });

  if (kind === "acompanhamento") {
    // perguntas do modelo de acompanhamento: o texto do cabeçalho leva à chave certa (acomp_N)
    const { data: qs } = await admin.from("form_questions").select("key, label").eq("form_key", "acompanhamento");
    const map = new Map((qs ?? []).map((q) => [normLabel(q.label as string), q.key as string]));
    const { rows } = readSheet(csv, map);
    if (rows.length === 0) return "Não encontrei linhas na planilha. Baixe como CSV (Arquivo → Fazer download → .csv) com a primeira linha de cabeçalho.";

    const { data: mine } = await admin.from("intake_records").select("id, answers").eq("form_key", FORM_KEY).eq("created_by", me.id);
    const byProc = new Map((mine ?? []).map((x) => [(x.answers as Record<string, { value: string }>).processo?.value ?? "", x]));
    let done = 0, created = 0, dup = 0;
    for (const r of rows.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""))) {
      let rec = byProc.get(r.processo);
      if (!rec) {
        // sem formulário para esse processo: cria um provisório só com o que a planilha informa
        const prov = {
          processo: { label: "2. Número do processo", value: r.processo },
          nomes: { label: "3. Nome completo da(s) criança(s)/adolescente(s)", value: `(formulário não importado) processo ${r.processo}` },
          ...(r.answers.acomp_1 ? { profissional: { label: "1. Profissional responsável pelo acompanhamento", value: r.answers.acomp_1.value } } : {}),
          _template: { label: "Modelo de formulário", value: "Provisório (criado pela importação de acompanhamento)" },
          _meta: { shared: [], followups: [], history: [entry("formulario", "criou formulário provisório ao importar acompanhamento")], editing: {} },
        };
        const { data: ins } = await admin.from("intake_records")
          .insert({ form_key: FORM_KEY, created_by: me.id, answers: prov }).select("id, answers").single();
        if (!ins) continue;
        rec = ins; byProc.set(r.processo, ins); created++;
      }
      const answers = rec.answers as Record<string, unknown>;
      const meta = (answers._meta ?? {}) as { shared?: unknown[]; followups?: { at: string; answers: Record<string, unknown> }[]; history?: unknown[]; editing?: unknown };
      const list = meta.followups ?? [];
      const at = r.at ?? stamp;
      if (list.some((f) => f.at === at)) { dup++; continue; }
      list.push({ at, by_name: by, answers: r.answers } as never);
      list.sort((a, b) => a.at.localeCompare(b.at));
      const latest = list[list.length - 1];
      meta.followups = list; meta.shared = meta.shared ?? []; meta.editing = meta.editing ?? {};
      meta.history = [entry("acompanhamento", "importou da planilha"), ...(meta.history ?? [])];
      await admin.from("intake_records")
        .update({ followup: latest.answers, followup_at: latest.at, answers: { ...answers, _meta: meta } })
        .eq("id", rec.id);
      rec.answers = { ...answers, _meta: meta };
      done++;
    }
    revalidatePath("/usuarios", "layout");
    if (done === 0 && dup > 0) return `ok:nada novo — ${dup} acompanhamento(s) já estavam importados.`;
    return `ok:${done} acompanhamento(s) importado(s)${created ? `; ${created} formulário(s) provisório(s) criado(s)` : ""}${dup ? `; ${dup} já existia(m)` : ""}.`;
  }

  const { rows } = readSheet(csv);
  if (rows.length === 0) return "Não encontrei linhas na planilha. Baixe como CSV (Arquivo → Fazer download → .csv) com a primeira linha de cabeçalho.";
  const { data: mine } = await admin.from("intake_records").select("answers").eq("form_key", FORM_KEY).eq("created_by", me.id);
  const seen = new Set((mine ?? []).map((x) => {
    const a = x.answers as Record<string, { value: string }>;
    return `${a.processo?.value}|${a.nomes?.value}`;
  }));
  let done = 0, skipped = 0;
  for (const r of rows) {
    const k = `${r.answers.processo?.value}|${r.answers.nomes?.value}`;
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    const answers = {
      ...r.answers,
      _template: { label: "Modelo de formulário", value: "Importado da planilha" },
      _meta: { shared: [], followups: [], history: [entry("formulario", "importou da planilha")], editing: {} },
    };
    const { error } = await admin.from("intake_records").insert({
      form_key: FORM_KEY, created_by: me.id, answers, ...(r.at ? { created_at: r.at } : {}),
    });
    if (!error) done++;
  }
  revalidatePath("/usuarios", "layout");
  return skipped ? `ok:${done} formulário(s) importado(s); ${skipped} já existia(m).` : `ok:${done}`;
}
