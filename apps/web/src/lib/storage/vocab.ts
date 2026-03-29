import type { WordCard } from "../vocabTypes";

const VOCAB_WORDS_KEY = "et_vocab_words_v1";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
}

function wordKey(word: string) {
  return (word || "").trim().toLowerCase();
}

export function loadVocabWords(): WordCard[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(VOCAB_WORDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as WordCard[];
    if (!Array.isArray(parsed)) return [];
    // Backward compatibility for older saved cards.
    return parsed.map((w) => ({
      ...w,
      synonyms: toStringArray((w as unknown as { synonyms?: unknown }).synonyms),
      antonyms: toStringArray((w as unknown as { antonyms?: unknown }).antonyms),
    }));
  } catch {
    return [];
  }
}

export function saveVocabWords(words: WordCard[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOCAB_WORDS_KEY, JSON.stringify(words));
}

export function upsertVocabWords(wordsToUpsert: WordCard[]) {
  const existing = loadVocabWords();
  const map = new Map<string, WordCard>();

  for (const w of existing) map.set(wordKey(w.word), w);
  for (const w of wordsToUpsert) map.set(wordKey(w.word), { ...w });

  const merged = Array.from(map.values());
  saveVocabWords(merged);
  return merged;
}

export function deleteVocabWord(word: string) {
  const existing = loadVocabWords();
  const key = wordKey(word);
  const filtered = existing.filter((w) => wordKey(w.word) !== key);
  saveVocabWords(filtered);
  return filtered;
}

export function addCustomWord(input: { word: string; ipa?: string | null; translation: string; example?: string | null }) {
  const word = input.word.trim();
  if (!word) throw new Error("Word is required.");
  if (!input.translation.trim()) throw new Error("Translation is required.");

  return upsertVocabWords([
    {
      word,
      ipa: input.ipa?.trim() ? input.ipa : null,
      translation: input.translation.trim(),
      example: input.example?.trim() ? input.example.trim() : null,
      synonyms: [],
      antonyms: [],
    },
  ]);
}

