/**
 * Represents a single format (video/audio) option
 */
export interface Format {
  format_id: string;
  format_note?: string;
  ext?: string;
  protocol?: string;
  acodec?: string;
  vcodec?: string;
  url?: string;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  rows?: number;
  columns?: number;
  fragments?: Array<{ url: string; duration: number }>;
  audio_ext?: string;
  video_ext?: string;
  vbr?: number | null;
  abr?: number | null;
  tbr?: number | null;
  resolution?: string | null;
  aspect_ratio?: number | null;
  filesize_approx?: number | null;
  http_headers?: Record<string, string>;
  format?: string;
  asr?: number | null;
  filesize?: number | null;
  source_preference?: number;
  audio_channels?: number | null;
  quality?: number | null;
  has_drm?: boolean;
  language?: string | null;
  language_preference?: number;
  preference?: number | null;
  dynamic_range?: string | null;
  container?: string;
  available_at?: number;
  downloader_options?: { http_chunk_size: number };
  stretched_ratio?: number | null;
}

/**
 * Represents a thumbnail image
 */
export interface Thumbnail {
  url: string;
  preference?: number;
  id: string;
  height?: number;
  width?: number;
  resolution?: string;
}

/**
 * Represents a chapter marker
 */
export interface Chapter {
  start_time: number;
  title: string;
  end_time: number;
}

/**
 * The main interface for the video metadata object
 */
export interface VideoMetadata {
  id: string;
  title: string;
  formats: Format[];
  thumbnails: Thumbnail[];
  thumbnail: string;
  description: string;
  channel_id: string;
  channel_url: string;
  duration: number;
  view_count: number;
  average_rating: number | null;
  age_limit: number;
  webpage_url: string;
  categories: string[];
  tags: string[];
  playable_in_embed: boolean;
  live_status: string;
  media_type: string;
  release_timestamp: number;
  _format_sort_fields: string[];
  automatic_captions: Record<string, any>;
  subtitles: Record<string, any>;
  comment_count: number;
  chapters: Chapter[];
  heatmap: any | null;
  like_count: number;
  channel: string;
  channel_follower_count: number;
  creators: any | null;
  uploader: string;
  uploader_id: string;
  uploader_url: string;
  upload_date: string;
  timestamp: number;
  availability: string;
  original_url: string;
  webpage_url_basename: string;
  webpage_url_domain: string;
  extractor: string;
  extractor_key: string;
  playlist: any | null;
  playlist_index: number | null;
  display_id: string;
  fulltitle: string;
  duration_string: string;
  release_date: string;
  release_year: number;
  is_live: boolean;
  was_live: boolean;
  requested_subtitles: any | null;
  _has_drm: boolean | null;
  epoch: number;
  requested_downloads: any[];
  format: string;
  format_id: string;
  ext: string;
  protocol: string;
  language: string;
  format_note: string;
  filesize_approx: number;
  tbr: number;
  width: number;
  height: number;
  resolution: string;
  fps: number;
  dynamic_range: string;
  vcodec: string;
  vbr: number;
  stretched_ratio: number | null;
  aspect_ratio: number;
  acodec: string;
  abr: number;
  asr: number;
  audio_channels: number;
  _type: "video";
  _version: {
    version: string;
    current_git_head: string | null;
    release_git_head: string;
    repository: string;
  };
}

//Playlist specific interfaces..
/**
 * Renamed to avoid collision with existing Video Thumbnail interfaces.
 */
export interface PlaylistThumbnail {
  url: string;
  height: number;
  width: number;
  id?: string;
  resolution?: string;
}

/**
 * Represents an individual entry (video/audio) within a playlist extraction.
 */
export interface PlaylistEntry {
  _type: string;
  ie_key: string;
  id: string;
  url: string;
  title: string;
  description: string | null;
  duration: number;
  channel_id: string | null;
  channel: string | null;
  channel_url: string | null;
  uploader: string | null;
  uploader_id: string | null;
  uploader_url: string | null;
  thumbnails: PlaylistThumbnail[];
  timestamp: string | null;
  release_timestamp: string | null;
  availability: string | null;
  view_count: number | null;
  live_status: string | null;
  channel_is_verified: boolean | null;
}

/**
 * Renamed from YoutubePlaylistMetadata to GenericPlaylistMetadata
 * to reflect that yt-dlp works with any supported site.
 */
export interface GenericPlaylistMetadata {
  id: string;
  title: string;
  availability: string | null;
  description: string;
  tags: string[];
  thumbnails: PlaylistThumbnail[];
  modified_date: string;
  view_count: number;
  playlist_count: number;
  channel: string;
  channel_id: string;
  uploader_id: string;
  uploader: string;
  channel_url: string;
  uploader_url: string;
  _type: "playlist";
  entries: PlaylistEntry[];
  webpage_url: string;
  original_url: string;
  extractor: string;
}
