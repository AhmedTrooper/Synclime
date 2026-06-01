import { createSignal, onMount, Show, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../store/useUIStore";
import { Plus, Trash2, Edit2, Save, X, Settings2, ShieldCheck, Database, GlobeLock, CheckSquare, Square, ChevronDown } from "lucide-solid";

export interface CookieProfile {
  slug: string;
  title: string;
  domain: string;
  cookie_data: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyProfile {
  slug: string;
  title: string;
  proxy_string: string;
  created_at: string;
  updated_at: string;
}

export interface SiteConfig {
  slug: string;
  title: string;
  domain: string;
  cookie_profile_slug: string | null;
  proxy_profile_slug: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const CustomSelect = (props: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string, label: string }[];
  placeholder: string;
  compact?: boolean;
}) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const selected = () => props.options.find(o => o.value === props.value);

  return (
    <div class={`relative w-full ${isOpen() ? "z-50" : "z-10"}`}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class={`w-full flex items-center justify-between ${props.compact ? "px-2.5 py-1.5 text-[10px] sm:text-xs" : "px-3.5 py-2 text-xs sm:text-sm"} bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 text-zinc-900 dark:text-white transition-all shadow-inner outline-none font-semibold cursor-pointer`}
      >
        <span class="truncate">{selected() ? selected()!.label : props.placeholder}</span>
        <ChevronDown class={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${isOpen() ? "rotate-180" : ""}`} />
      </button>
      
      <Show when={isOpen()}>
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div class="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-x-hidden overflow-y-auto py-1 max-h-60 custom-scrollbar overscroll-contain animate-fade-in origin-top pointer-events-auto">
          <button
            type="button"
            onClick={() => { props.onChange(""); setIsOpen(false); }}
            class={`w-full text-left px-3.5 py-2.5 ${props.compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"} transition-all cursor-pointer ${!props.value ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"}`}
          >
            {props.placeholder}
          </button>
          <Show when={props.options.length > 0}>
             <div class="h-[1px] bg-zinc-200 dark:bg-zinc-800 w-full my-1" />
          </Show>
          <For each={props.options}>
            {(opt) => (
              <button
                type="button"
                onClick={() => { props.onChange(opt.value); setIsOpen(false); }}
                class={`w-full text-left px-3.5 py-2.5 ${props.compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"} transition-all truncate cursor-pointer ${props.value === opt.value ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"}`}
              >
                {opt.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default function SitesConfig() {
  const [activeTab, setActiveTab] = createSignal<"sites" | "cookies" | "proxies">("cookies");

  const [cookies, setCookies] = createSignal<CookieProfile[]>([]);
  const [selectedCookies, setSelectedCookies] = createSignal<string[]>([]);
  
  const [newCookieTitle, setNewCookieTitle] = createSignal("");
  const [newCookieDomain, setNewCookieDomain] = createSignal("");
  const [newCookieData, setNewCookieData] = createSignal("");
  
  const [editingCookie, setEditingCookie] = createSignal<string | null>(null);
  const [editCookieData, setEditCookieData] = createSignal("");

  const [proxies, setProxies] = createSignal<ProxyProfile[]>([]);
  const [selectedProxies, setSelectedProxies] = createSignal<string[]>([]);
  const [newProxyTitle, setNewProxyTitle] = createSignal("");
  const [newProxyData, setNewProxyData] = createSignal("");
  const [editingProxy, setEditingProxy] = createSignal<string | null>(null);
  const [editProxyData, setEditProxyData] = createSignal("");

  const [sites, setSites] = createSignal<SiteConfig[]>([]);
  const [newSiteTitle, setNewSiteTitle] = createSignal("");
  const [newSiteDomain, setNewSiteDomain] = createSignal("");
  const [newSiteCookieSlug, setNewSiteCookieSlug] = createSignal("");
  const [newSiteProxySlug, setNewSiteProxySlug] = createSignal("");

  onMount(() => {
    useUIStore.setActivePath("/sites_config");
    loadCookies();
    loadProxies();
    loadSites();
  });

  const loadCookies = async () => {
    try {
      const data = await invoke<CookieProfile[]>("get_cookie_profiles");
      setCookies(data);
    } catch (err) {
      console.error("Failed to load cookies", err);
    }
  };

  const handleAddCookie = async (e: Event) => {
    e.preventDefault();
    if (!newCookieTitle() || !newCookieDomain() || !newCookieData()) return;
    try {
      await invoke("add_cookie_profile", {
        title: newCookieTitle(),
        domain: newCookieDomain(),
        cookieData: newCookieData(),
      });
      setNewCookieTitle("");
      setNewCookieDomain("");
      setNewCookieData("");
      loadCookies();
    } catch (err) {
      console.error("Failed to add cookie", err);
    }
  };

  const handleDeleteCookie = async (slug: string) => {
    try {
      await invoke("delete_cookie_profile", { slug });
      setSelectedCookies((prev) => prev.filter((id) => id !== slug));
      loadCookies();
    } catch (err) {
      console.error("Failed to delete cookie", err);
    }
  };

  const handleBatchDeleteCookies = async () => {
    if (selectedCookies().length === 0) return;
    try {
      await invoke("batch_delete_cookie_profiles", { slugs: selectedCookies() });
      setSelectedCookies([]);
      loadCookies();
    } catch (err) {
      console.error("Failed to batch delete cookies", err);
    }
  };

  const handleUpdateCookie = async (slug: string) => {
    if (!editCookieData()) return;
    try {
      await invoke("update_cookie_data", {
        slug,
        cookieData: editCookieData(),
      });
      setEditingCookie(null);
      setEditCookieData("");
      loadCookies();
    } catch (err) {
      console.error("Failed to update cookie", err);
    }
  };

  const toggleSelectCookie = (slug: string) => {
    setSelectedCookies(prev => prev.includes(slug) ? prev.filter(id => id !== slug) : [...prev, slug]);
  };

  const toggleSelectAll = () => {
    if (selectedCookies().length === cookies().length) {
      setSelectedCookies([]);
    } else {
      setSelectedCookies(cookies().map(c => c.slug));
    }
  };

  const loadProxies = async () => {
    try {
      const data = await invoke<ProxyProfile[]>("get_proxy_profiles");
      setProxies(data);
    } catch (err) {
      console.error("Failed to load proxies", err);
    }
  };

  const handleAddProxy = async (e: Event) => {
    e.preventDefault();
    if (!newProxyTitle() || !newProxyData()) return;
    try {
      await invoke("add_proxy_profile", {
        title: newProxyTitle(),
        proxyString: newProxyData(),
      });
      setNewProxyTitle("");
      setNewProxyData("");
      loadProxies();
    } catch (err) {
      console.error("Failed to add proxy", err);
    }
  };

  const handleDeleteProxy = async (slug: string) => {
    try {
      await invoke("delete_proxy_profile", { slug });
      setSelectedProxies((prev) => prev.filter((id) => id !== slug));
      loadProxies();
    } catch (err) {
      console.error("Failed to delete proxy", err);
    }
  };

  const handleBatchDeleteProxies = async () => {
    if (selectedProxies().length === 0) return;
    try {
      await invoke("batch_delete_proxy_profiles", { slugs: selectedProxies() });
      setSelectedProxies([]);
      loadProxies();
    } catch (err) {
      console.error("Failed to batch delete proxies", err);
    }
  };

  const handleUpdateProxy = async (slug: string) => {
    if (!editProxyData()) return;
    try {
      await invoke("update_proxy_data", {
        slug,
        proxyString: editProxyData(),
      });
      setEditingProxy(null);
      setEditProxyData("");
      loadProxies();
    } catch (err) {
      console.error("Failed to update proxy", err);
    }
  };

  const toggleSelectProxy = (slug: string) => {
    setSelectedProxies(prev => prev.includes(slug) ? prev.filter(id => id !== slug) : [...prev, slug]);
  };

  const toggleSelectAllProxies = () => {
    if (selectedProxies().length === proxies().length) {
      setSelectedProxies([]);
    } else {
      setSelectedProxies(proxies().map(p => p.slug));
    }
  };

  const loadSites = async () => {
    try {
      const data = await invoke<SiteConfig[]>("get_site_configs");
      setSites(data);
    } catch (err) {
      console.error("Failed to load sites", err);
    }
  };

  const handleAddSite = async (e: Event) => {
    e.preventDefault();
    if (!newSiteTitle() || !newSiteDomain()) return;
    try {
      await invoke("add_site_config", {
        title: newSiteTitle(),
        domain: newSiteDomain(),
        cookieProfileSlug: newSiteCookieSlug() || null,
        proxyProfileSlug: newSiteProxySlug() || null,
        isDefault: false,
      });
      setNewSiteTitle("");
      setNewSiteDomain("");
      setNewSiteCookieSlug("");
      setNewSiteProxySlug("");
      loadSites();
    } catch (err) {
      console.error("Failed to add site", err);
    }
  };

  const handleDeleteSite = async (slug: string) => {
    try {
      await invoke("delete_site_config", { slug });
      loadSites();
    } catch (err) {
      console.error("Failed to delete site", err);
    }
  };

  const handleUpdateSite = async (slug: string, cookieSlug: string | null, proxySlug: string | null) => {
    try {
      await invoke("update_site_config", {
        slug,
        cookieProfileSlug: cookieSlug,
        proxyProfileSlug: proxySlug,
      });
      loadSites();
    } catch (err) {
      console.error("Failed to update site", err);
    }
  };

  return (
    <div class="w-full max-w-5xl mx-auto space-y-4.5 select-none animate-fade-in text-xs sm:text-sm font-sans px-1">
      
      {/* Desktop Preference Panel Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80 gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shadow-sm">
            <GlobeLock class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h1 class="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-tight uppercase">Network Preferences</h1>
            <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Configure network route bypasses, cookie injectors, and proxies</p>
          </div>
        </div>
      </div>

      {/* Structured Multi-Panel Split Dashboard */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Desktop Sidebar Navigation inside Settings Pane */}
        <div class="lg:col-span-3 flex flex-col gap-1 border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 rounded-2xl backdrop-blur-md">
          <span class="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2.5 py-1 text-left">Configuration Categories</span>
          <button
            onClick={() => setActiveTab("sites")}
            class={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab() === "sites" 
                ? "bg-white dark:bg-white/10 text-blue-600 dark:text-white font-extrabold shadow-sm" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
            }`}
          >
            <div class="flex items-center gap-2">
              <Database class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <span>Domain Router</span>
            </div>
            <span class="text-[10px] bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">{sites().length}</span>
          </button>
          <button
            onClick={() => setActiveTab("cookies")}
            class={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab() === "cookies" 
                ? "bg-white dark:bg-white/10 text-blue-600 dark:text-white font-extrabold shadow-sm" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
            }`}
          >
            <div class="flex items-center gap-2">
              <ShieldCheck class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <span>Cookie Vault</span>
            </div>
            <span class="text-[10px] bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">{cookies().length}</span>
          </button>
          <button
            onClick={() => setActiveTab("proxies")}
            class={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab() === "proxies" 
                ? "bg-white dark:bg-white/10 text-blue-600 dark:text-white font-extrabold shadow-sm" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
            }`}
          >
            <div class="flex items-center gap-2">
              <Settings2 class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <span>Proxy Networks</span>
            </div>
            <span class="text-[10px] bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">{proxies().length}</span>
          </button>
        </div>

        {/* Right Side: Tab Panels Area */}
        <div class="lg:col-span-9 flex flex-col">
          
          {/* DOMAIN ROUTER TAB */}
          <Show when={activeTab() === "sites"}>
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-fade-in w-full">
              
              {/* Rules List Container */}
              <div class="xl:col-span-7 space-y-3.5 flex flex-col justify-between">
                <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left">
                  <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center justify-between">
                    <span>Active Domain Rules</span>
                    <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold">Total: {sites().length}</span>
                  </h3>
                  
                  <div class="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-0.5 mt-3">
                    <For each={sites()}>
                      {(site) => (
                        <div class="border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-3.5 rounded-xl space-y-3 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                          <div class="flex items-start justify-between gap-3">
                            <div class="flex flex-col min-w-0">
                              <span class="text-xs font-black text-zinc-900 dark:text-white truncate">{site.title}</span>
                              <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{site.domain}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteSite(site.slug)}
                              class="p-1.5 text-red-500/80 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div class="grid grid-cols-2 gap-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                            <div class="flex flex-col gap-1.5">
                              <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Cookie Vault profile</span>
                              <CustomSelect
                                value={site.cookie_profile_slug || ""}
                                onChange={(val) => handleUpdateSite(site.slug, val || null, site.proxy_profile_slug)}
                                options={cookies().map(c => ({ value: c.slug, label: c.title }))}
                                placeholder="None (Direct)"
                                compact={true}
                              />
                            </div>
                            <div class="flex flex-col gap-1.5">
                              <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Proxy Network profile</span>
                              <CustomSelect
                                value={site.proxy_profile_slug || ""}
                                onChange={(val) => handleUpdateSite(site.slug, site.cookie_profile_slug, val || null)}
                                options={proxies().map(p => ({ value: p.slug, label: p.title }))}
                                placeholder="None (Bypass)"
                                compact={true}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </For>

                    <Show when={sites().length === 0}>
                      <div class="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/5 my-1">
                        <span class="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">No domain routing overrides configured</span>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>

              {/* Creator Form Inspector */}
              <div class="xl:col-span-5 space-y-3.5 text-left">
                <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                  <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center gap-1.5">
                    <Plus class="w-4 h-4 text-emerald-500" />
                    <span>Create Domain Match</span>
                  </h3>
                  <form onSubmit={handleAddSite} class="space-y-4 mt-3">
                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Rule Label</label>
                      <input
                        type="text"
                        placeholder="e.g. YouTube Premium Account"
                        value={newSiteTitle()}
                        onInput={(e) => setNewSiteTitle(e.currentTarget.value)}
                        class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-xs text-zinc-900 dark:text-white shadow-inner font-sans font-medium"
                        required
                      />
                    </div>
                    
                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Domain Match Criteria</label>
                      <input
                        type="text"
                        placeholder="e.g. youtube.com"
                        value={newSiteDomain()}
                        onInput={(e) => setNewSiteDomain(e.currentTarget.value)}
                        class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-xs font-mono text-zinc-900 dark:text-white shadow-inner font-medium"
                        required
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Link Cookie Vault Profile</label>
                      <CustomSelect
                        value={newSiteCookieSlug()}
                        onChange={setNewSiteCookieSlug}
                        options={cookies().map(c => ({ value: c.slug, label: `${c.title} (${c.domain})` }))}
                        placeholder="No Cookie Vault (Bypass)"
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Link Proxy Network Profile</label>
                      <CustomSelect
                        value={newSiteProxySlug()}
                        onChange={setNewSiteProxySlug}
                        options={proxies().map(p => ({ value: p.slug, label: p.title }))}
                        placeholder="No Proxy Network (Direct)"
                      />
                    </div>

                    <button
                      type="submit"
                      class="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.99] tracking-wider cursor-pointer border border-blue-500/20"
                    >
                      <Save class="w-3.5 h-3.5" />
                      <span>Save Domain Rule</span>
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </Show>

          {/* COOKIE VAULT TAB */}
          <Show when={activeTab() === "cookies"}>
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-fade-in w-full">
              
              {/* Cookies List */}
              <div class="xl:col-span-7 space-y-3.5 flex flex-col justify-between">
                <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left">
                  <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center justify-between">
                    <span>Stored Netscape Credentials</span>
                    
                    <Show when={cookies().length > 0}>
                      <div class="flex items-center gap-1.5">
                        <button
                          onClick={toggleSelectAll}
                          class="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                          title={selectedCookies().length === cookies().length ? "Deselect All" : "Select All"}
                        >
                          <Show when={selectedCookies().length === cookies().length} fallback={<CheckSquare class="w-3.5 h-3.5" />}>
                            <Square class="w-3.5 h-3.5" />
                          </Show>
                        </button>
                        <Show when={selectedCookies().length > 0}>
                          <button
                            onClick={handleBatchDeleteCookies}
                            class="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Delete Selected"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </h3>
                  
                  <div class="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-0.5 mt-3">
                    <For each={cookies()}>
                      {(cookie) => (
                        <div class="border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-3 rounded-xl flex flex-col gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                          <div class="flex items-start sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={selectedCookies().includes(cookie.slug)}
                                onChange={() => toggleSelectCookie(cookie.slug)}
                                class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 flex-shrink-0 cursor-pointer"
                              />
                              <div class="flex flex-col min-w-0">
                                <span class="text-xs font-black text-zinc-900 dark:text-white truncate">{cookie.title}</span>
                                <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{cookie.domain}</span>
                              </div>
                            </div>
                            <div class="flex items-center gap-1.5 flex-shrink-0">
                              <Show when={editingCookie() === cookie.slug} fallback={
                                <button
                                  onClick={() => {
                                    setEditingCookie(cookie.slug);
                                    setEditCookieData(cookie.cookie_data);
                                  }}
                                  class="p-1.5 text-zinc-500 hover:text-blue-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                  title="Edit Cookie Data"
                                >
                                  <Edit2 class="w-3.5 h-3.5" />
                                </button>
                              }>
                                <button
                                  onClick={() => setEditingCookie(null)}
                                  class="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                >
                                  <X class="w-3.5 h-3.5" />
                                </button>
                              </Show>
                              <button
                                onClick={() => handleDeleteCookie(cookie.slug)}
                                class="p-1.5 text-red-500/70 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                                title="Delete Profile"
                              >
                                <Trash2 class="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <Show when={editingCookie() === cookie.slug}>
                            <div class="flex flex-col gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 animate-fade-in">
                              <textarea
                                value={editCookieData()}
                                onInput={(e) => setEditCookieData(e.currentTarget.value)}
                                class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-[10px] font-mono min-h-[100px] text-zinc-900 dark:text-white shadow-inner"
                              />
                              <button
                                onClick={() => handleUpdateCookie(cookie.slug)}
                                class="w-full sm:w-auto self-end flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase py-1.5 px-3 rounded-lg transition-colors cursor-pointer border border-blue-500/10"
                                title="Save Updates"
                              >
                                <Save class="w-3 h-3" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>

                    <Show when={cookies().length === 0}>
                      <div class="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/5 my-1">
                        <span class="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">No Netscape credentials imported</span>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>

              {/* Add Cookie Inspector */}
              <div class="xl:col-span-5 space-y-3.5 text-left">
                <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] space-y-4">
                  <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center gap-1.5">
                    <Plus class="w-4 h-4 text-emerald-500" />
                    <span>Import Cookies</span>
                  </h3>
                  
                  <form onSubmit={handleAddCookie} class="space-y-4">
                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Profile Label</label>
                      <input
                        type="text"
                        placeholder="e.g. YouTube Premium Profile"
                        value={newCookieTitle()}
                        onInput={(e) => setNewCookieTitle(e.currentTarget.value)}
                        class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-xs text-zinc-900 dark:text-white shadow-inner font-sans font-medium"
                        required
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Primary Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. youtube.com"
                        value={newCookieDomain()}
                        onInput={(e) => setNewCookieDomain(e.currentTarget.value)}
                        class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-xs font-mono text-zinc-900 dark:text-white shadow-inner font-medium"
                        required
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Netscape Cookie String</label>
                      <textarea
                        placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1735689&#9;SID&#9;ABC..."
                        value={newCookieData()}
                        onInput={(e) => setNewCookieData(e.currentTarget.value)}
                        class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-[10px] font-mono min-h-[110px] text-zinc-900 dark:text-white shadow-inner"
                        required
                      />
                    </div>

                    {/* Netscape Warning Terminal Alert */}
                    <div class="flex items-start gap-2.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 p-3 rounded-xl select-none leading-relaxed">
                      <ShieldCheck class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div class="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Netscape Format Required</div>
                        <p class="text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Only raw Netscape cookie format files are matched by standard yt-dlp parsers. JSON/key-value blocks will throw authentication errors.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      class="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.99] tracking-wider cursor-pointer border border-blue-500/20"
                    >
                      <Save class="w-3.5 h-3.5" />
                      <span>Save Credentials</span>
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </Show>

          {/* PROXY NETWORKS TAB */}
          <Show when={activeTab() === "proxies"}>
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start animate-fade-in w-full">
              
              {/* Proxy List */}
              <div class="xl:col-span-7 space-y-3.5 flex flex-col justify-between">
                <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-left">
                  <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center justify-between">
                    <span>Configured Proxies</span>
                    
                    <Show when={proxies().length > 0}>
                      <div class="flex items-center gap-1.5">
                        <button
                          onClick={toggleSelectAllProxies}
                          class="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                          title={selectedProxies().length === proxies().length ? "Deselect All" : "Select All"}
                        >
                          <Show when={selectedProxies().length === proxies().length} fallback={<CheckSquare class="w-3.5 h-3.5" />}>
                            <Square class="w-3.5 h-3.5" />
                          </Show>
                        </button>
                        <Show when={selectedProxies().length > 0}>
                          <button
                            onClick={handleBatchDeleteProxies}
                            class="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Delete Selected"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </h3>
                  
                  <div class="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-0.5 mt-3">
                    <For each={proxies()}>
                      {(proxy) => (
                        <div class="border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-3 rounded-xl flex flex-col gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                          <div class="flex items-start sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={selectedProxies().includes(proxy.slug)}
                                onChange={() => toggleSelectProxy(proxy.slug)}
                                class="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 flex-shrink-0 cursor-pointer"
                              />
                              <div class="flex flex-col min-w-0 font-sans">
                                <span class="text-xs font-black text-zinc-900 dark:text-white truncate">{proxy.title}</span>
                                <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{proxy.proxy_string}</span>
                              </div>
                            </div>
                            <div class="flex items-center gap-1.5 flex-shrink-0">
                              <Show when={editingProxy() === proxy.slug} fallback={
                                <button
                                  onClick={() => {
                                    setEditingProxy(proxy.slug);
                                    setEditProxyData(proxy.proxy_string);
                                  }}
                                  class="p-1.5 text-zinc-500 hover:text-blue-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                  title="Edit Proxy String"
                                >
                                  <Edit2 class="w-3.5 h-3.5" />
                                </button>
                              }>
                                <button
                                  onClick={() => setEditingProxy(null)}
                                  class="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                                >
                                  <X class="w-3.5 h-3.5" />
                                </button>
                              </Show>
                              <button
                                onClick={() => handleDeleteProxy(proxy.slug)}
                                class="p-1.5 text-red-500/70 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                                title="Delete Profile"
                              >
                                <Trash2 class="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <Show when={editingProxy() === proxy.slug}>
                            <div class="flex flex-col gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 animate-fade-in">
                              <input
                                type="text"
                                value={editProxyData()}
                                onInput={(e) => setEditProxyData(e.currentTarget.value)}
                                class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-[10px] font-mono text-zinc-900 dark:text-white shadow-inner"
                              />
                              <button
                                onClick={() => handleUpdateProxy(proxy.slug)}
                                class="w-full sm:w-auto self-end flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase py-1.5 px-3 rounded-lg transition-colors cursor-pointer border border-blue-500/10"
                                title="Save Updates"
                              >
                                <Save class="w-3 h-3" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>

                    <Show when={proxies().length === 0}>
                      <div class="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/5 my-1">
                        <span class="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">No proxy configuration strings active</span>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>

              {/* Add Proxy Form */}
              <div class="xl:col-span-5 space-y-3.5 text-left">
                <div class="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.01)] space-y-4">
                  <h3 class="text-xs font-black text-zinc-800 dark:text-zinc-200 tracking-tight uppercase border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 flex items-center gap-1.5">
                    <Plus class="w-4 h-4 text-emerald-500" />
                    <span>Create Proxy String</span>
                  </h3>
                  
                  <form onSubmit={handleAddProxy} class="space-y-4">
                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Profile Label</label>
                      <input
                        type="text"
                        placeholder="e.g. US Dedicated SOCKS5"
                        value={newProxyTitle()}
                        onInput={(e) => setNewProxyTitle(e.currentTarget.value)}
                        class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-xs text-zinc-900 dark:text-white shadow-inner font-sans font-medium"
                        required
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Proxy URI Connection</label>
                      <input
                        type="text"
                        placeholder="socks5://user:pass@192.168.1.1:1080"
                        value={newProxyData()}
                        onInput={(e) => setNewProxyData(e.currentTarget.value)}
                        class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none text-xs font-mono text-zinc-900 dark:text-white shadow-inner font-medium"
                        required
                      />
                    </div>

                    {/* Format support info */}
                    <div class="flex items-start gap-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800/80 p-3 rounded-xl leading-relaxed">
                      <Settings2 class="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div class="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Supported Protocols</div>
                        <p class="text-zinc-400 dark:text-zinc-500 mt-0.5">
                          Standard connection formats: HTTP, HTTPS, SOCKS4, and SOCKS5 are supported by the downloader subprocess.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      class="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.99] tracking-wider cursor-pointer border border-blue-500/20"
                    >
                      <Save class="w-3.5 h-3.5" />
                      <span>Save Network Profile</span>
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </Show>

        </div>

      </div>

    </div>
  );
}
