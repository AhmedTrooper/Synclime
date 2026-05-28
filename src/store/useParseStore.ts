import { create } from "zustand";

interface ParseState {
  tokens: string[];
  isParsing: boolean;
  addToken: (token: string) => void;
  clearTokens: () => void;
  setParsing: (parsing: boolean) => void;
}

export const useParseStore = create<ParseState>((set) => ({
  tokens: [],
  isParsing: false,
  addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })),
  clearTokens: () => set({ tokens: [] }),
  setParsing: (parsing) => set({ isParsing: parsing }),
}));
