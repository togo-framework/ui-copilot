'use client'

import { useRef, useEffect } from 'react'
import { User, Sparkles } from 'lucide-react'
import { ScrollArea } from '@togo-framework/ui-core'
import StreamingMessage from './StreamingMessage'
import ArtifactViewer from './ArtifactViewer'
import { ArtifactRenderer } from './artifacts'
import type { CopilotMessage, ArtifactPayload, A2UIArtifact } from './types'

// Re-export types for consumers
export type { ArtifactPayload }

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ThreadMessage {
  id: string
  role: 'user' | 'assistant'
  /** English content — always present */
  text_en: string
  /** Arabic content — used when language === 'ar' */
  text_ar?: string
  /** Legacy controller-slug artifacts (ArtifactViewer). */
  artifacts?: ArtifactPayload[]
  /** A2UI structured artifacts from the Cortex SSE stream (table/chart/card/…). */
  a2uiArtifacts?: A2UIArtifact[]
}

interface ChatThreadProps {
  messages: ThreadMessage[]
  /** The text currently being accumulated from the SSE stream */
  streamingText?: string
  isStreaming?: boolean
  /** UI language. Defaults to 'en'. */
  language?: 'en' | 'ar'
  /** Text direction. Inferred from language when not provided. */
  dir?: 'ltr' | 'rtl'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const AssistantAvatar = () => (
  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1">
    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
  </div>
)
AssistantAvatar.displayName = 'AssistantAvatar'

const UserAvatar = () => (
  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-1">
    <User className="w-3.5 h-3.5 text-muted-foreground" />
  </div>
)
UserAvatar.displayName = 'UserAvatar'

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * ChatThread
 *
 * Renders the full conversation history plus an optional live streaming tail.
 * Bilingual: reads `text_ar` when language === 'ar', falls back to `text_en`.
 * RTL-aware: message alignment and avatar order flip for Arabic.
 * Auto-scrolls to the bottom on new messages or streaming token updates.
 *
 * All app deps removed — language/dir are plain props.
 */
const ChatThread = ({
  messages,
  streamingText = '',
  isStreaming = false,
  language = 'en',
  dir,
}: ChatThreadProps) => {
  const isRTL = dir === 'rtl' || (dir === undefined && language === 'ar')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText])

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="space-y-3 min-h-full" dir={isRTL ? 'rtl' : 'ltr'}>
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {language === 'ar'
                ? 'اسأل المساعد أي سؤال وسيرد بالمعلومات التي تحتاجها'
                : 'Ask the copilot anything — it will answer with the information you need'}
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const text = language === 'ar' ? (msg.text_ar || msg.text_en) : msg.text_en
          const isUser = msg.role === 'user'

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                isUser
                  ? isRTL ? 'justify-start flex-row-reverse' : 'justify-end'
                  : isRTL ? 'justify-end flex-row-reverse' : 'justify-start'
              }`}
            >
              {!isUser && !isRTL && <AssistantAvatar />}
              {isUser && isRTL && <UserAvatar />}

              <div className="max-w-[85%] space-y-1.5">
                {isUser ? (
                  <div className="rounded-xl px-3 py-2 bg-primary text-primary-foreground text-sm">
                    {text}
                  </div>
                ) : (
                  <StreamingMessage text={text} isStreaming={false} language={language} dir={isRTL ? 'rtl' : 'ltr'} />
                )}

                {msg.artifacts && msg.artifacts.length > 0 && (
                  <div className="space-y-2">
                    {msg.artifacts.map((artifact, idx) => (
                      <ArtifactViewer
                        key={`${msg.id}-artifact-${idx}`}
                        artifact={artifact}
                        language={language}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    ))}
                  </div>
                )}

                {/* A2UI structured artifacts from the Cortex SSE stream (table/chart/card/…) */}
                {msg.a2uiArtifacts && msg.a2uiArtifacts.length > 0 && (
                  <div className="space-y-2">
                    {msg.a2uiArtifacts.map((artifact, idx) => (
                      <ArtifactRenderer
                        key={`${msg.id}-a2ui-${idx}`}
                        artifact={artifact}
                        language={language}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    ))}
                  </div>
                )}
              </div>

              {!isUser && isRTL && <AssistantAvatar />}
              {isUser && !isRTL && <UserAvatar />}
            </div>
          )
        })}

        {(isStreaming || streamingText) && (
          <div className={`flex gap-2 ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
            {!isRTL && <AssistantAvatar />}
            <div className="max-w-[85%]">
              <StreamingMessage
                text={streamingText}
                isStreaming={isStreaming}
                language={language}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            {isRTL && <AssistantAvatar />}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

ChatThread.displayName = 'ChatThread'

export default ChatThread

// ── Utility: convert CopilotMessage[] → ThreadMessage[] ───────────────────────

let _msgCounter = 0
export function toThreadMessages(messages: CopilotMessage[]): ThreadMessage[] {
  return messages.map((m) => ({
    id: `msg-${_msgCounter++}`,
    role: m.role,
    text_en: m.content,
    text_ar: m.content_ar,
    artifacts: m.artifacts,
    a2uiArtifacts: m.a2uiArtifacts,
  }))
}