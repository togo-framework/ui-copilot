'use client'

/**
 * Intel component types — shared type definitions for the IntelCard family,
 * ScopeGauge, ScopesAtAGlance, and FeedHeader.
 *
 * Design rules:
 *   - Rule 8  — bilingual (EN/AR): all user-facing text fields carry _en / _ar pairs
 *   - Rule 25 — product-agnostic: pure rendering types, no fetching, no context reads
 *   - Rule 26 — video = metadata only (URL + poster + permalink; never embedded player)
 */

// ── Severity ──────────────────────────────────────────────────────────────────

export type IntelSeverity = 'critical' | 'high' | 'medium' | 'low'

// ── Media (Rule 26 — video = metadata only) ───────────────────────────────────

export type IntelMediaType = 'image' | 'video' | 'none'

/**
 * OG / Open-Graph embed metadata — carried by Scout when a page exposes
 * og: or Twitter card tags. Used to render a compact source-preview sub-card
 * (favicon + site name + title + small thumbnail) on hero/detail variants.
 *
 * All fields are optional — a partial embed is still worth showing.
 */
export interface IntelEmbed {
  /** Page title (og:title / twitter:title) */
  title?: string
  /** Short description (og:description) */
  description?: string
  /** Small preview image URL (og:image) — NOT the article primary image */
  image?: string
  /** Site/publisher name (og:site_name) */
  site?: string
  /** Canonical URL of the linked page */
  url?: string
}

export interface IntelMedia {
  /**
   * Media type discriminator.
   *  - 'image': render image_url (or imageUrl legacy field)
   *  - 'video': render thumbnail_url as poster + play-badge linking to video_url (Rule 26)
   *  - 'none':  no visual media (embed may still be present)
   *
   * `type` (legacy) is kept for backward compatibility; prefer `media_type`.
   */
  type?: IntelMediaType
  /** Preferred: discriminator field matching the bridge/pipeline contract */
  media_type?: IntelMediaType

  // ── Image fields ─────────────────────────────────────────────────────────
  /**
   * Primary article/post image. Preferred over imageUrl.
   * When absent and thumbnail_url is set, thumbnail_url is used as fallback.
   */
  image_url?: string
  /**
   * Platform-provided poster / thumbnail URL.
   * For video: this is the poster shown before the play-badge affordance (Rule 26).
   * For image: used as fallback when image_url is absent.
   */
  thumbnail_url?: string
  /** Legacy field — maps to image_url internally. Kept for backward compat. */
  imageUrl?: string

  // ── Video fields (Rule 26 — permalink + poster ONLY) ──────────────────
  /**
   * External permalink to the original video page (YouTube watch URL, tweet URL, …).
   * NEVER the raw media file or HLS stream.
   */
  video_url?: string
  /** Legacy alias of video_url. */
  videoUrl?: string
  /** Human-readable platform label shown on the play-badge (e.g. "YouTube", "X"). */
  videoPlatform?: string

  // ── OG embed ──────────────────────────────────────────────────────────
  /**
   * Open-Graph / og metadata for a compact source-preview sub-card.
   * Rendered only on hero and detail (compact) variants — not on row variant.
   */
  embed?: IntelEmbed

  /** Alt text for accessibility (image_url / thumbnail_url) */
  alt?: string
}

// ── Source cluster ─────────────────────────────────────────────────────────────

export interface IntelSource {
  /** Favicon URL — 16×16 or 32×32 */
  faviconUrl?: string
  /** Source domain or name for tooltip / accessibility */
  name?: string
}

export interface IntelSourceCluster {
  sources: IntelSource[]
  totalCount: number
  /** ISO timestamp for the most recent source item */
  latestAt?: string
}

// ── Smart actions ─────────────────────────────────────────────────────────────

export interface IntelCardActions {
  onWatch?: () => void
  onAddToCase?: () => void
  onAsk?: () => void
  /** Whether this item is already in the watchlist */
  isWatched?: boolean
}

// ── FeedCard — the data shape expected by IntelCard ───────────────────────────

export interface FeedCard {
  id: string
  slug?: string

  /** Severity level drives the severity chip color */
  severity: IntelSeverity

  /** Scope name — shown in the severity chip after the severity label */
  scopeName_en?: string
  scopeName_ar?: string

  /** Headline / title */
  title_en: string
  title_ar?: string

  /** 1–2 line summary */
  summary_en?: string
  summary_ar?: string

  /** Optional media attachment */
  media?: IntelMedia

  /** Source cluster */
  sourceCluster?: IntelSourceCluster

  /** Timestamp of the item (ISO string) */
  publishedAt?: string
  updatedAt?: string
}

// ── Scope gauge / sidebar row ─────────────────────────────────────────────────

export interface ScopeGaugeItem {
  id: string
  name_en: string
  name_ar?: string
  /** 0–100 score */
  score: number
  /** Optional descriptive label for the score */
  scoreLabel_en?: string
  scoreLabel_ar?: string
}

// ── FeedHeader slot types ─────────────────────────────────────────────────────
// FeedHeader is a composition shell — products slot in tabs + actions.

export type FeedHeaderLanguage = 'en' | 'ar'
