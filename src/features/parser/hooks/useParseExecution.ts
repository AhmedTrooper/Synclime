import { createSignal } from "solid-js";

export function useParseExecution() {
  const [loading, setLoading] = createSignal(false);
  const [data, setData] = createSignal<any>(null);

  const parse = async (url: string) => {
    console.log("Parsing target URL:", url);
    setLoading(true);
    try {
      // Simulate metadata fetching delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setData({
        title: "Introduction to Tauri & React - Premium Guide",
        author: "Synclime Dev Team",
        duration: "14:25",
        views: "1,240",
        thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=60",
        subtitles: [
          { lang: "en", name: "English" },
          { lang: "es", name: "Español" },
        ],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return { parse, loading, data };
}
