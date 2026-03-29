import type { VocabGenerateRequest, VocabGenerateResponse } from "../vocabTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

export async function generateVocab(req: VocabGenerateRequest): Promise<VocabGenerateResponse> {
  const resp = await fetch(`${API_BASE}/v1/vocab/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || `Vocab generate failed: ${resp.status}`);
  }

  return (await resp.json()) as VocabGenerateResponse;
}

