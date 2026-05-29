import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ParsedFile {
  slug: string;
  url: string;
  title: string;
  sanitizedTitle: string;
  isPlaylist: boolean;
  thumbnail: string;
  duration: number; // in seconds
  author: string;
  views: number;
  payload: any; // VideoMetadata or GenericPlaylistMetadata
  parsedAt: string; // ISO string
}

interface ParseState {
  parsedFiles: ParsedFile[];
  isParsing: boolean;
  addParsedFile: (file: ParsedFile) => void;
  clearParsedFiles: () => void;
  setParsing: (parsing: boolean) => void;
}

export const useParseStore = create<ParseState>()(
  persist(
    (set) => ({
      parsedFiles: [],
      isParsing: false,
      addParsedFile: (file) =>
        set((state) => ({
          parsedFiles: [file, ...state.parsedFiles.filter((f) => f.slug !== file.slug)],
        })),
      clearParsedFiles: () => set({ parsedFiles: [] }),
      setParsing: (parsing) => set({ isParsing: parsing }),
    }),
    {
      name: "synclime-parse-storage",
      partialize: (state) => ({ parsedFiles: state.parsedFiles }),
    }
  )
);

