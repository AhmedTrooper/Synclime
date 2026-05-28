// SQLite and database schema types
export interface UserConfig {
  id: string;
  theme: "dark" | "light";
  downloadPath: string;
}

export interface SiteConfig {
  slug: string;
  title: string;
  domain: string;
  cookie_path: string;
  is_default: 0 | 1;
  created_at: string;
}
