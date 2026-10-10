"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, addDoc, ensureBucket, newDocId, removeDocMeta, findDoc, type DocMeta } from "@/lib/documents";
import { readSheet } from "@/lib/importSheet";
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
  const { rows } = readSheet(csv);
  if (rows.length === 0) return "Não encontrei linhas na planilha. Baixe como CSV (Arquivo → Fazer download → .csv) com a primeira linha de cabeçalho.";
  const admin = createAdminClient();
  const by = me.name || me.email;
  const entry = {
    at: new Date().toISOString(), by_id: me.id, by_name: by, scope: kind === "acompanhamento" ? "acompanhamento" : "formulario",
    changes: [], note: "importou da planilha",
  };

  if (kind === "acompanhamento") {
    const { data: mine } = await admin.from("intake_records").select("id, answers").eq("form_key", FORM_KEY).eq("created_by", me.id);
    let done = 0; const miss: string[] = [];
    for (const r of rows) {
      const rec = (mine ?? []).find((x) => (x.answers as Record<string, { value: string }>).processo?.value === r.processo);
      if (!rec) { miss.push(r.processo || "(sem processo)"); continue; }
      const answers = rec.answers as Record<string, unknown>;
      const meta = (answers._meta ?? { shared: [], history: [], editing: {} }) as { history: unknown[] };
      meta.history = [entry, ...(meta.history ?? [])];
      await admin.from("intake_records")
        .update({ followup: r.answers, followup_at: r.at ?? new Date().toISOString(), answers: { ...answers, _meta: meta } })
        .eq("id", rec.id);
      done++;
    }
    revalidatePath("/usuarios", "layout");
    if (done === 0) return `Nenhum acompanhamento encontrou o formulário pelo número do processo (${miss.slice(0, 3).join(", ")}). Importe antes os formulários.`;
    return miss.length ? `ok:${done} acompanhamento(s) importado(s). Sem formulário para: ${miss.join(", ")}.` : `ok:${done}`;
  }

  // evita duplicar: mesmo processo + mesmos nomes já cadastrados por você
  const { data: mine } = await admin.from("intake_records").select("answers").eq("form_key", FORM_KEY).eq("created_by", me.id);
  const seen = new Set((mine ?? []).map((x) => {
    const a = x.answers as Record<string, { value: string }>;
    return `${a.processo?.value}|${a.nomes?.value}`;
  }));
  let done = 0; let skipped = 0;
  for (const r of rows) {
    const k = `${r.answers.processo?.value}|${r.answers.nomes?.value}`;
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    const answers = {
      ...r.answers,
      _template: { label: "Modelo de formulário", value: "Importado da planilha" },
      _meta: { shared: [], history: [entry], editing: {} },
    };
    const { error } = await admin.from("intake_records").insert({
      form_key: FORM_KEY, created_by: me.id, answers,
      ...(r.at ? { created_at: r.at } : {}),
    });
    if (!error) done++;
  }
  revalidatePath("/usuarios", "layout");
  return skipped ? `ok:${done} formulário(s) importado(s); ${skipped} já existia(m).` : `ok:${done}`;
}
