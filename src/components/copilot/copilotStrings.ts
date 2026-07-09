// ── Copilot standalone i18n fallback ─────────────────────────────────────────
//
// useSafeT() returns null when the dock/launcher is mounted WITHOUT a
// LanguageProvider (isolated renders, Storybook stories that forget the
// provider, host apps that don't use the kit i18n). Previously the fallback
// was `(key) => key`, so the UI showed raw keys like "copilot:placeholder".
//
// This module provides a built-in English dictionary for the namespaces the
// dock + launcher actually read (copilot:*, nav:copilot, common:close), so the
// surface reads correctly even with no provider. The provider path is
// unchanged — when a LanguageProvider IS present, langCtx.t wins.

import enJson from '../../i18n/locales/en.json'

type Dict = Record<string, unknown>

const EN = enJson as unknown as Dict

/**
 * fallbackT — resolve a namespaced i18n key ("ns:key") against the bundled
 * English locale. Returns the raw key when the namespace/key is unknown so the
 * miss is still visible in development.
 */
export function fallbackT(key: string): string {
  const idx = key.indexOf(':')
  if (idx === -1) {
    const v = EN[key]
    return typeof v === 'string' ? v : key
  }
  const ns = key.slice(0, idx)
  const leaf = key.slice(idx + 1)
  const bucket = EN[ns]
  if (bucket && typeof bucket === 'object') {
    const v = (bucket as Dict)[leaf]
    if (typeof v === 'string') return v
  }
  return key
}
