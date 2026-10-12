"use client";
// Transcrição de áudio no próprio navegador (Whisper, em português), depois da gravação.
// O modelo é baixado uma vez (fica guardado no navegador); o áudio não sai do aparelho.

type Progress = (msg: string) => void;
let asr: ((audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string }>) | null = null;
let loading: Promise<void> | null = null;

const importUrl = (u: string) => (new Function("u", "return import(u)") as (u: string) => Promise<Record<string, unknown>>)(u);

async function load(onProgress: Progress) {
  if (asr) return;
  if (!loading) {
    loading = (async () => {
      onProgress("Preparando a transcrição…");
      const lib = await importUrl("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5");
      const pipeline = lib.pipeline as (task: string, model: string, opts: Record<string, unknown>) => Promise<typeof asr>;
      asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-base", {
        progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
          if (p.status === "progress" && typeof p.progress === "number") onProgress(`Baixando o modelo de transcrição (só na primeira vez)… ${Math.round(p.progress)}%`);
        },
      });
    })().finally(() => { loading = null; });
  }
  await loading;
}

export async function transcribeBlob(blob: Blob, onProgress: Progress): Promise<string> {
  await load(onProgress);
  onProgress("Transcrevendo…");
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = decoded.getChannelData(0);
    const out = await asr!(data, { language: "portuguese", task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
    return (out.text ?? "").trim();
  } finally {
    void ctx.close();
  }
}
