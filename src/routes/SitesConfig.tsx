import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useUIStore } from "../store/useUIStore";
import { Plus, Trash2, Edit2, Save, X, Settings2, ShieldCheck, Database, GlobeLock, CheckSquare, Square, ChevronDown } from "lucide-react";

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

const CustomSelect = ({ value, onChange, options, placeholder, compact = false }: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string, label: string }[];
  placeholder: string;
  compact?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className={`relative w-full ${isOpen ? "z-50" : "z-10"}`}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between ${compact ? "px-2 py-1.5 text-[11px] sm:text-xs" : "px-3 py-2.5 sm:py-2 text-xs sm:text-sm"} bg-zinc-50 dark:bg-black/20 hover:bg-zinc-100 dark:hover:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-zinc-900 dark:text-white transition-all`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl shadow-xl overflow-x-hidden overflow-y-auto py-1 max-h-60 custom-scrollbar overscroll-contain animate-fade-in origin-top pointer-events-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 ${compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"} transition-all ${!value ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"}`}
            >
              {placeholder}
            </button>
            {options.length > 0 && <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 w-full my-1" />}
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 ${compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"} transition-all truncate ${value === opt.value ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function SitesConfig() {
  const { setActivePath } = useUIStore();
  const [activeTab, setActiveTab] = useState<"sites" | "cookies" | "proxies">("cookies");

  // Cookie State
  const [cookies, setCookies] = useState<CookieProfile[]>([]);
  const [selectedCookies, setSelectedCookies] = useState<string[]>([]);
  
  // New Cookie Form State
  const [newCookieTitle, setNewCookieTitle] = useState("");
  const [newCookieDomain, setNewCookieDomain] = useState("");
  const [newCookieData, setNewCookieData] = useState("");
  
  // Edit State
  const [editingCookie, setEditingCookie] = useState<string | null>(null);
  const [editCookieData, setEditCookieData] = useState("");

  // Proxy State
  const [proxies, setProxies] = useState<ProxyProfile[]>([]);
  const [selectedProxies, setSelectedProxies] = useState<string[]>([]);
  const [newProxyTitle, setNewProxyTitle] = useState("");
  const [newProxyData, setNewProxyData] = useState("");
  const [editingProxy, setEditingProxy] = useState<string | null>(null);
  const [editProxyData, setEditProxyData] = useState("");

  // Site Router State
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [newSiteTitle, setNewSiteTitle] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [newSiteCookieSlug, setNewSiteCookieSlug] = useState("");
  const [newSiteProxySlug, setNewSiteProxySlug] = useState("");

  useEffect(() => {
    setActivePath("/sites_config");
    loadCookies();
    loadProxies();
    loadSites();
  }, [setActivePath]);

  const loadCookies = async () => {
    try {
      const data = await invoke<CookieProfile[]>("get_cookie_profiles");
      setCookies(data);
    } catch (err) {
      console.error("Failed to load cookies", err);
    }
  };

  const handleAddCookie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCookieTitle || !newCookieDomain || !newCookieData) return;
    try {
      await invoke("add_cookie_profile", {
        title: newCookieTitle,
        domain: newCookieDomain,
        cookieData: newCookieData,
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
    if (selectedCookies.length === 0) return;
    try {
      await invoke("batch_delete_cookie_profiles", { slugs: selectedCookies });
      setSelectedCookies([]);
      loadCookies();
    } catch (err) {
      console.error("Failed to batch delete cookies", err);
    }
  };

  const handleUpdateCookie = async (slug: string) => {
    if (!editCookieData) return;
    try {
      await invoke("update_cookie_data", {
        slug,
        cookieData: editCookieData,
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
    if (selectedCookies.length === cookies.length) {
      setSelectedCookies([]);
    } else {
      setSelectedCookies(cookies.map(c => c.slug));
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

  const handleAddProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProxyTitle || !newProxyData) return;
    try {
      await invoke("add_proxy_profile", {
        title: newProxyTitle,
        proxyString: newProxyData,
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
    if (selectedProxies.length === 0) return;
    try {
      await invoke("batch_delete_proxy_profiles", { slugs: selectedProxies });
      setSelectedProxies([]);
      loadProxies();
    } catch (err) {
      console.error("Failed to batch delete proxies", err);
    }
  };

  const handleUpdateProxy = async (slug: string) => {
    if (!editProxyData) return;
    try {
      await invoke("update_proxy_data", {
        slug,
        proxyString: editProxyData,
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
    if (selectedProxies.length === proxies.length) {
      setSelectedProxies([]);
    } else {
      setSelectedProxies(proxies.map(p => p.slug));
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

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteTitle || !newSiteDomain) return;
    try {
      await invoke("add_site_config", {
        title: newSiteTitle,
        domain: newSiteDomain,
        cookieProfileSlug: newSiteCookieSlug || null,
        proxyProfileSlug: newSiteProxySlug || null,
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
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full py-2 px-1 sm:px-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-500 rounded-md text-white shadow-sm">
            <GlobeLock className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Routing & Networks</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-zinc-200 dark:border-white/10 pb-2 overflow-x-auto custom-scrollbar flex-shrink-0">
        <button
          onClick={() => setActiveTab("sites")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors select-none whitespace-nowrap ${
            activeTab === "sites" ? "bg-zinc-900 dark:bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Domain Router
        </button>
        <button
          onClick={() => setActiveTab("cookies")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors select-none whitespace-nowrap ${
            activeTab === "cookies" ? "bg-zinc-900 dark:bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Cookie Vault
        </button>
        <button
          onClick={() => setActiveTab("proxies")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors select-none whitespace-nowrap ${
            activeTab === "proxies" ? "bg-zinc-900 dark:bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" /> Proxy Networks
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex flex-col gap-6 pb-64">
        {activeTab === "cookies" && (
          <div className="flex flex-col gap-6">
            {/* Add Form */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add New Cookie Profile
              </h3>
              <form onSubmit={handleAddCookie} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Profile Title (e.g. YouTube Premium)"
                    value={newCookieTitle}
                    onChange={(e) => setNewCookieTitle(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs sm:text-sm text-zinc-900 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Domain (e.g. youtube.com)"
                    value={newCookieDomain}
                    onChange={(e) => setNewCookieDomain(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs sm:text-sm text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <textarea
                  placeholder="Paste raw Netscape cookie data here (only Netscape format is supported)..."
                  value={newCookieData}
                  onChange={(e) => setNewCookieData(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-[10px] sm:text-xs min-h-[100px] font-mono text-zinc-900 dark:text-white"
                  required
                />
                
                {/* Format Alert Notice */}
                <div className="flex items-start gap-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/15 p-3 rounded-lg select-none">
                  <ShieldCheck className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-bold">Cookie Format Notice</h4>
                    <p className="text-[11px] text-zinc-650 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Only the standard <strong>Netscape cookie format</strong> is supported by the download sub-engine. JSON or other cookie formats are <strong>not supported</strong> and will result in network authentication errors.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto self-end flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-colors shadow-md shadow-emerald-500/20"
                  title="Save Profile"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Stored Cookies ({cookies.length})
                </h3>
                {cookies.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
                      title={selectedCookies.length === cookies.length ? "Deselect All" : "Select All"}
                    >
                      {selectedCookies.length === cookies.length ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    </button>
                    {selectedCookies.length > 0 && (
                      <button
                        onClick={handleBatchDeleteCookies}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md transition-colors"
                        title="Delete Selected"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {cookies.map(cookie => (
                  <div key={cookie.slug} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedCookies.includes(cookie.slug)}
                          onChange={() => toggleSelectCookie(cookie.slug)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">{cookie.title}</span>
                          <span className="text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">{cookie.domain}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {editingCookie !== cookie.slug ? (
                          <button
                            onClick={() => {
                              setEditingCookie(cookie.slug);
                              setEditCookieData(cookie.cookie_data);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-blue-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors"
                            title="Edit Cookie Data"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingCookie(null)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCookie(cookie.slug)}
                          className="p-1.5 text-red-500/70 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {editingCookie === cookie.slug && (
                      <div className="flex flex-col gap-3 mt-1 sm:mt-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 animate-fade-in">
                        <textarea
                          value={editCookieData}
                          onChange={(e) => setEditCookieData(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-[10px] sm:text-xs font-mono min-h-[80px] text-zinc-900 dark:text-white"
                        />
                        <button
                          onClick={() => handleUpdateCookie(cookie.slug)}
                          className="w-full sm:w-auto self-end flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white p-2 sm:p-1.5 rounded-lg transition-colors shadow-md shadow-blue-500/20"
                          title="Save Updates"
                        >
                          <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {cookies.length === 0 && (
                  <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">No cookie profiles saved.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "sites" && (
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add New Domain Rule
              </h3>
              <form onSubmit={handleAddSite} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Rule Title (e.g. YouTube Restricted)"
                    value={newSiteTitle}
                    onChange={(e) => setNewSiteTitle(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs sm:text-sm text-zinc-900 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Domain Match (e.g. youtube.com)"
                    value={newSiteDomain}
                    onChange={(e) => setNewSiteDomain(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs sm:text-sm font-mono text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    value={newSiteCookieSlug}
                    onChange={setNewSiteCookieSlug}
                    options={cookies.map(c => ({ value: c.slug, label: `${c.title} (${c.domain})` }))}
                    placeholder="No Cookie Profile Assigned"
                  />
                  <CustomSelect
                    value={newSiteProxySlug}
                    onChange={setNewSiteProxySlug}
                    options={proxies.map(p => ({ value: p.slug, label: p.title }))}
                    placeholder="No Proxy Profile Assigned"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto self-end flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-colors shadow-md shadow-emerald-500/20"
                  title="Create Rule"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Active Domain Rules ({sites.length})
              </h3>
              
              <div className="flex flex-col gap-3">
                {sites.map(site => (
                  <div key={site.slug} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{site.title}</span>
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{site.domain}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSite(site.slug)}
                        className="p-1.5 text-red-500/70 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors flex-shrink-0"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cookie Override</span>
                        <CustomSelect
                          value={site.cookie_profile_slug || ""}
                          onChange={(val) => handleUpdateSite(site.slug, val || null, site.proxy_profile_slug)}
                          options={cookies.map(c => ({ value: c.slug, label: c.title }))}
                          placeholder="None"
                          compact={true}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Proxy Override</span>
                        <CustomSelect
                          value={site.proxy_profile_slug || ""}
                          onChange={(val) => handleUpdateSite(site.slug, site.cookie_profile_slug, val || null)}
                          options={proxies.map(p => ({ value: p.slug, label: p.title }))}
                          placeholder="None"
                          compact={true}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {sites.length === 0 && (
                  <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">No domain rules configured.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "proxies" && (
          <div className="flex flex-col gap-6">
            {/* Add Form */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Add New Proxy Configuration
              </h3>
              <form onSubmit={handleAddProxy} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Profile Title (e.g. US Residential VPN)"
                  value={newProxyTitle}
                  onChange={(e) => setNewProxyTitle(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs sm:text-sm text-zinc-900 dark:text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Proxy String (e.g. socks5://user:pass@192.168.1.1:1080)"
                  value={newProxyData}
                  onChange={(e) => setNewProxyData(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-xs sm:text-sm font-mono text-zinc-900 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto self-end flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-colors shadow-md shadow-emerald-500/20"
                  title="Save Profile"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Stored Proxy Networks ({proxies.length})
                </h3>
                {proxies.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllProxies}
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
                      title={selectedProxies.length === proxies.length ? "Deselect All" : "Select All"}
                    >
                      {selectedProxies.length === proxies.length ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    </button>
                    {selectedProxies.length > 0 && (
                      <button
                        onClick={handleBatchDeleteProxies}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md transition-colors"
                        title="Delete Selected"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {proxies.map(proxy => (
                  <div key={proxy.slug} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedProxies.includes(proxy.slug)}
                          onChange={() => toggleSelectProxy(proxy.slug)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">{proxy.title}</span>
                          <span className="text-[10px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">{proxy.proxy_string}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {editingProxy !== proxy.slug ? (
                          <button
                            onClick={() => {
                              setEditingProxy(proxy.slug);
                              setEditProxyData(proxy.proxy_string);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-blue-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors"
                            title="Edit Proxy String"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingProxy(null)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProxy(proxy.slug)}
                          className="p-1.5 text-red-500/70 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {editingProxy === proxy.slug && (
                      <div className="flex flex-col gap-3 mt-1 sm:mt-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 animate-fade-in">
                        <input
                          type="text"
                          value={editProxyData}
                          onChange={(e) => setEditProxyData(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 text-[10px] sm:text-xs font-mono text-zinc-900 dark:text-white"
                        />
                        <button
                          onClick={() => handleUpdateProxy(proxy.slug)}
                          className="w-full sm:w-auto self-end flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white p-2 sm:p-1.5 rounded-lg transition-colors shadow-md shadow-blue-500/20"
                          title="Save Updates"
                        >
                          <Save className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {proxies.length === 0 && (
                  <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">No proxy networks saved.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
