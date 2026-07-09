'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Globe, Newspaper, Microscope, Paperclip, ChevronDown, Brain, Zap } from 'lucide-react'
import FilePreviewChip from './FilePreviewChip'
import type { ChatAttachment, ForcedTools } from '../copilot/types'

// Re-export types for consumers
export type { ForcedTools }

// ── X/Twitter icon ─────────────────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'image/heic', 'image/heif',
  'application/pdf',
])

const SEARCH_SOURCES = [
  { id: 'web',    label: 'Web',    labelAr: 'ويب',       icon: Globe },
  { id: 'news',   label: 'News',   labelAr: 'أخبار',     icon: Newspaper },
  { id: 'social', label: 'Social', labelAr: 'اجتماعي',   icon: XIcon },
] as const

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatToolbarProps {
  forcedTools: ForcedTools
  onForcedToolsChange: (tools: ForcedTools) => void
  attachments: ChatAttachment[]
  onAttachmentsChange: (attachments: ChatAttachment[]) => void
  thinkingMode: boolean
  onThinkingModeChange: (enabled: boolean) => void
  disabled?: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Exposes the internal upload function so the parent can trigger file
   *  upload on drag-drop (mirror of the original `onUploadReady` pattern). */
  onUploadReady?: (uploadFn: (files: File[]) => Promise<void>) => void
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * ChatToolbar
 *
 * Tool pills row: thinking-mode toggle, search (with source picker), deep
 * research, and file attachment. Manages file encoding locally (base64 inline).
 *
 * All app deps removed — language is a plain prop.
 */
const ChatToolbar = ({
  forcedTools,
  onForcedToolsChange,
  attachments,
  onAttachmentsChange,
  thinkingMode,
  onThinkingModeChange,
  disabled,
  language = 'en',
  onUploadReady,
}: ChatToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isAr = language === 'ar'

  const isSearchActive = !!forcedTools.search
  const isDeepResearchActive = !!forcedTools.deep_research

  const toggleSearch = () => {
    if (isSearchActive) {
      onForcedToolsChange({ ...forcedTools, search: false, search_sources: undefined })
    } else {
      onForcedToolsChange({ search: true, search_sources: ['web'], deep_research: false })
    }
  }

  const toggleDeepResearch = () => {
    if (isDeepResearchActive) {
      onForcedToolsChange({ ...forcedTools, deep_research: false })
    } else {
      onForcedToolsChange({ search: false, search_sources: undefined, deep_research: true })
    }
  }

  const toggleSource = (sourceId: string) => {
    const current = forcedTools.search_sources || ['web']
    const isActive = current.includes(sourceId)
    let next: string[]
    if (isActive) {
      next = current.filter(s => s !== sourceId)
      if (next.length === 0) next = ['web']
    } else {
      next = [...current, sourceId]
    }
    onForcedToolsChange({ ...forcedTools, search_sources: next })
  }

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setUploadError(null)
    const newAttachments: ChatAttachment[] = []

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(isAr ? 'الملف كبير جداً (الحد 10 ميغابايت)' : 'File too large (10MB limit)')
        continue
      }

      const mimeType = file.type || 'application/octet-stream'
      if (!ALLOWED_ATTACHMENT_MIMES.has(mimeType)) {
        setUploadError(isAr ? `نوع الملف غير مدعوم: ${mimeType}` : `Unsupported file type: ${mimeType}`)
        continue
      }

      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        newAttachments.push({ data, name: file.name, type: mimeType, size: file.size })
      } catch (err) {
        console.error('[ChatToolbar]', 'File encode error', { file: file.name, err })
        setUploadError(isAr ? 'فشل تحميل الملف' : 'Failed to load file')
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments])
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [attachments, onAttachmentsChange, isAr])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await uploadFiles(Array.from(files))
  }, [uploadFiles])

  useEffect(() => {
    onUploadReady?.(uploadFiles)
  }, [uploadFiles, onUploadReady])

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index))
  }

  const activeSources = forcedTools.search_sources || ['web']

  return (
    <div className="space-y-2">
      {uploadError && (
        <p className="text-xs text-destructive px-1">{uploadError}</p>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <FilePreviewChip
              key={i}
              attachment={att}
              onRemove={() => removeAttachment(i)}
              language={language}
            />
          ))}
        </div>
      )}

      {/* Source picker (shown when search is active) */}
      {isSearchActive && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">
            {isAr ? 'مصادر' : 'Sources'}
          </span>
          {SEARCH_SOURCES.map(source => {
            const isActive = activeSources.includes(source.id)
            const Icon = source.icon
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                disabled={disabled}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-fast ease-standard border ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                }`}
              >
                <Icon className="w-3 h-3" />
                {isAr ? source.labelAr : source.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Main tool pills */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onThinkingModeChange(!thinkingMode)}
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-fast ease-standard border ${
            thinkingMode
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
          }`}
          title={thinkingMode
            ? (isAr ? 'وضع التفكير العميق' : 'Thinking mode — deeper analysis')
            : (isAr ? 'الوضع السريع' : 'Fast mode — quicker responses')}
        >
          {thinkingMode ? <Brain className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          {thinkingMode ? (isAr ? 'تفكير' : 'Thinking') : (isAr ? 'سريع' : 'Fast')}
        </button>

        <button
          onClick={toggleSearch}
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-fast ease-standard border ${
            isSearchActive
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          {isAr ? 'بحث' : 'Search'}
          {isSearchActive && <ChevronDown className="w-3 h-3 rotate-180" />}
        </button>

        <button
          onClick={toggleDeepResearch}
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-fast ease-standard border ${
            isDeepResearchActive
              ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
              : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'
          }`}
        >
          <Microscope className="w-3.5 h-3.5" />
          {isAr ? 'بحث عميق' : 'Deep Research'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-fast ease-standard border bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground"
        >
          <Paperclip className={`w-3.5 h-3.5 ${uploading ? 'animate-spin' : ''}`} />
          {attachments.length > 0
            ? `${attachments.length}`
            : (isAr ? 'إرفاق' : 'Attach')}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}

ChatToolbar.displayName = 'ChatToolbar'

export default ChatToolbar