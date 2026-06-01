import { createStore } from "solid-js/store";
import { createEffect, on, createRoot } from "solid-js";
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
}

const [parseState, setParseState] = createStore<ParseState>({
  parsedFiles: [],
  isParsing: false,
});

let hasHydrated = false;

export const useParseStore = {
  get state() {
    return parseState;
  },
  addParsedFile: (file: ParsedFile) =>
    setParseState("parsedFiles", (files) => [file, ...files.filter((f) => f.slug !== file.slug)]),
  removeParsedFile: (slug: string) =>
    setParseState("parsedFiles", (files) => files.filter((f) => f.slug !== slug)),
  clearParsedFiles: () => setParseState("parsedFiles", []),
  setParsing: (parsing: boolean) => setParseState("isParsing", parsing),
};

// Async Hydration
nativeStorageAdapter.getItem("synclime-parse-storage").then((data) => {
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state && parsed.state.parsedFiles) {
        setParseState("parsedFiles", parsed.state.parsedFiles);
      }
    } catch (e) {
      console.warn("Failed to parse hydrated parse state", e);
    }
  }
  hasHydrated = true;
});

// Async Persistence (Syncs updates back to store automatically, bound to reactive root context)
createRoot(() => {
  createEffect(
    on(
      () => parseState.parsedFiles,
      () => {
        if (!hasHydrated) return;
        const stateToSave = { state: { parsedFiles: parseState.parsedFiles } };
        nativeStorageAdapter.setItem("synclime-parse-storage", JSON.stringify(stateToSave));
      },
      { defer: true }
    )
  );
});
