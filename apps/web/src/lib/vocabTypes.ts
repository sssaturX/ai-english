export type Level = "B1" | "B2" | "C1";

export type WordCard = {
  word: string;
  ipa: string | null;
  translation: string;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
};

export type VocabGenerateRequest = {
  count: number;
  level: Level;
  theme: string | null;
};

export type VocabGenerateResponse = {
  words: WordCard[];
};

