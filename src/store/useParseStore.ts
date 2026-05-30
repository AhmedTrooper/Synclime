import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nativeStorageAdapter } from "./storageAdapter";

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
  parentPlaylistSlug?: string;
  siteConfigSlug?: string;
}

interface ParseState {
  parsedFiles: ParsedFile[];
  isParsing: boolean;
  addParsedFile: (file: ParsedFile) => void;
  removeParsedFile: (slug: string) => void;
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
      removeParsedFile: (slug) =>
        set((state) => ({
          parsedFiles: state.parsedFiles.filter((f) => f.slug !== slug),
        })),
      clearParsedFiles: () => set({ parsedFiles: [] }),
      setParsing: (parsing) => set({ isParsing: parsing }),
    }),
    {
      name: "synclime-parse-storage",
      storage: createJSONStorage(() => nativeStorageAdapter),
      partialize: (state) => ({ parsedFiles: state.parsedFiles }),
    }
  )
);

