'use client'

/**
 * ChatSupport.tsx
 *
 * Production-grade AI chat widget for EthioCraft.
 *
 * Features:
 *  - Connects to the backend /api/v1/ai/chat/sessions & /messages endpoints
 *  - Gemini is the primary LLM (handled server-side); HF is automatic fallback
 *  - Live marketplace data (products, orders, drafts, samples, cart, users) is
 *    fetched by the backend and grounded in the reply
 *  - Role-based UI hints: ADMIN, VERIFICATION_AGENT, ARTISAN, CUSTOMER
 *  - Graceful "not available" messages when an endpoint fails
 *  - Clearly distinguishes Sample Status vs Draft Status in rendered replies
 *  - Markdown-lite rendering: bullet lists, bold, code spans
 *  - Session persistence across page navigations (stored in sessionStorage)
 *  - Animated typing indicator, auto-scroll, keyboard send
 *  - Model badge shows which provider answered (Gemini / HF / Fallback)
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'error'

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  /** Model that generated this reply (gemini-1.5-flash, HF model id, RULE_FALLBACK…) */
  model?: string
  /** Detected intent from the server */
  intent?: string
  /** Source label (LLM | LLM_CACHED | RULE_FALLBACK | GUARDRAIL_FALLBACK) */
  source?: string
}

interface BackendMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
  metadata?: {
    model?: string
    intent?: string
    source?: string
  }
}

interface BackendSession {
  id: string
  title: string
  status: string
}

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  ADMIN: {
    label: 'Admin Assistant',
    icon: Shield,
    color: 'from-rose-600 to-rose-800',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    hint: 'I can show you users, drafts, samples, orders, and audit logs.',
  },
  VERIFICATION_AGENT: {
    label: 'Verification Assistant',
    icon: Store,
    color: 'from-violet-600 to-violet-800',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    hint: 'I can show draft pipelines and sample queues for review.',
  },
  ARTISAN: {
    label: 'Artisan Assistant',
    icon: Sparkles,
    color: 'from-amber-600 to-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    hint: 'I can show your samples, drafts, and product performance.',
  },
  CUSTOMER: {
    label: 'Shopping Assistant',
    icon: ShoppingCart,
    color: 'from-emerald-600 to-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    hint: 'I can help you browse products, check your cart, and track orders.',
  },
  default: {
    label: 'EthioCraft Assistant',
    icon: Bot,
    color: 'from-stone-700 to-stone-900',
    badge: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    hint: 'Ask me about products, orders, payments, or anything about EthioCraft.',
  },
} as const

// ─── Quick-action chips per role ──────────────────────────────────────────────

const ROLE_QUICK_ACTIONS: Record<string, string[]> = {
  ADMIN: ['Show recent audit logs', 'List pending drafts', 'Show all users', 'Recent orders'],
  VERIFICATION_AGENT: ['Show pending drafts', 'Show assigned samples', 'Drafts in review'],
  ARTISAN: ['Show my sample status', 'Show my draft status', 'My product performance'],
  CUSTOMER: ["What's in my cart?", 'Track my orders', 'Browse new products'],
  default: ['How does EthioCraft work?', 'Show products', 'Help with my account'],
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────

/**
 * Converts plain-text reply (with markdown bullet points and bold) to JSX.
 * Keeps rendering fast without adding a heavy markdown library dependency.
 */
function renderContent(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    const key = `line-${i}`

    // Bullet point
    if (/^[•\-\*]\s/.test(line.trim())) {
      elements.push(
        <li key={key} className="ml-4 list-disc text-sm leading-relaxed">
          {renderInline(line.replace(/^[•\-\*]\s/, '').trim())}
        </li>
      )
      return
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const content = line.replace(/^\d+\.\s/, '').trim()
      elements.push(
        <li key={key} className="ml-4 list-decimal text-sm leading-relaxed">
          {renderInline(content)}
        </li>
      )
      return
    }

    // Status badges: highlight "Sample Status: X" and "Draft Status: X"
    if (/Sample Status:|Draft Status:/.test(line)) {
      const parts = line.split(/(Sample Status:\s*\S+|Draft Status:\s*\S+)/g)
      elements.push(
        <p key={key} className="text-sm leading-relaxed">
          {parts.map((part, pi) => {
            if (/Sample Status:/.test(part)) {
              const status = part.replace('Sample Status:', '').trim()
              return (
                <span key={pi}>
                  <span className="font-semibold text-violet-700 dark:text-violet-400">Sample Status:</span>{' '}
                  <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                    {status}
                  </span>
                </span>
              )
            }
            if (/Draft Status:/.test(part)) {
              const status = part.replace('Draft Status:', '').trim()
              return (
                <span key={pi}>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Draft Status:</span>{' '}
                  <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {status}
                  </span>
                </span>
              )
            }
            return <span key={pi}>{renderInline(part)}</span>
          })}
        </p>
      )
      return
    }

    // Heading (## or ###)
    if (/^#{2,3}\s/.test(line)) {
      elements.push(
        <p key={key} className="text-sm font-semibold mt-2 mb-0.5 text-foreground">
          {line.replace(/^#{2,3}\s/, '')}
        </p>
      )
      return
    }

    // Empty line → spacer
    if (!line.trim()) {
      elements.push(<div key={key} className="h-1" />)
      return
    }

    // Normal paragraph
    elements.push(
      <p key={key} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    )
  })

  return <>{elements}</>
}

/** Handles **bold** and `code` inline formatting. */
function renderInline(text: string): React.ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>
    }
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          {seg.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{seg}</span>
  })
}

// ─── Model badge ──────────────────────────────────────────────────────────────

function ModelBadge({ source, model }: { source?: string; model?: string }) {
  if (!source && !model) return null

  const isGemini = model?.toLowerCase().includes('gemini')
  const isHF = !isGemini && source === 'LLM'
  const isFallback = source === 'RULE_FALLBACK' || source === 'GUARDRAIL_FALLBACK'
  const isCached = source === 'LLM_CACHED'

  const label = isCached
    ? '⚡ cached'
    : isFallback
    ? '⚠ offline mode'
    : isGemini
    ? '✦ Gemini'
    : isHF
    ? '🤗 Hugging Face'
    : model?.slice(0, 20) || source || ''

  const cls = isFallback
    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    : isGemini
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'

  return (
    <span className={cn('mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-medium', cls)}>
      {label}
    </span>
  )
}

// ─── Session storage helpers ──────────────────────────────────────────────────

const SESSION_KEY = 'ethiocraft_chat_session_id'

function getStoredSessionId(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}
function storeSessionId(id: string) {
  try { sessionStorage.setItem(SESSION_KEY, id) } catch {}
}
function clearStoredSessionId() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatSupport() {
  const { role } = useAuth()
  const cfg = ROLE_CONFIG[(role as keyof typeof ROLE_CONFIG) ?? 'default'] ?? ROLE_CONFIG.default
  const RoleIcon = cfg.icon
  const quickActions = ROLE_QUICK_ACTIONS[role ?? 'default'] ?? ROLE_QUICK_ACTIONS.default

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimised, setIsMinimised] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isInitialising, setIsInitialising] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // ── Focus input when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimised) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, isMinimised])

  // ── Increment unread badge when closed ───────────────────────────────────
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'assistant') {
        setUnreadCount((n) => n + 1)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // ── Clear badge on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  // ── Initialise or restore chat session ───────────────────────────────────
  const initSession = useCallback(async () => {
    setIsInitialising(true)
    setSessionError(null)

    try {
      // Check if a session already exists
      const existingId = getStoredSessionId()
      if (existingId) {
        // Verify it's still valid
        const check = await apiFetch(`/ai/chat/sessions/${existingId}`)
        if (check.ok) {
          const json = await check.json()
          const session: BackendSession = json.data
          if (session.status === 'OPEN') {
            setSessionId(existingId)
            // Load history
            const msgRes = json.data?.messages as BackendMessage[] | undefined
            if (msgRes && msgRes.length > 0) {
              setMessages(
                msgRes.map((m) => ({
                  id: m.id,
                  role: m.role === 'USER' ? 'user' : 'assistant',
                  content: m.content,
                  timestamp: new Date(m.createdAt),
                  model: m.metadata?.model,
                  intent: m.metadata?.intent,
                  source: m.metadata?.source,
                }))
              )
            } else {
              setMessages([buildWelcome(role)])
            }
            setIsInitialising(false)
            return
          }
        }
        clearStoredSessionId()
      }

      // Create a new session
      const res = await apiFetch('/ai/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Support chat' }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 401) {
          // Not logged in – show anonymous welcome
          setMessages([buildAnonymousWelcome()])
          setIsInitialising(false)
          return
        }
        throw new Error(err?.message || `Session creation failed (${res.status})`)
      }

      const json = await res.json()
      const newSession: BackendSession = json.data
      storeSessionId(newSession.id)
      setSessionId(newSession.id)
      setMessages([buildWelcome(role)])
    } catch (err: any) {
      console.error('[ChatSupport] Session init failed:', err)
      setSessionError('Could not connect to the assistant. Please try again.')
      setMessages([buildAnonymousWelcome()])
    } finally {
      setIsInitialising(false)
    }
  }, [role])

  // Init session when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isInitialising) {
      initSession()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ── Build welcome messages ────────────────────────────────────────────────
  function buildWelcome(userRole: string | null): ChatMessage {
    const cfg = ROLE_CONFIG[(userRole as keyof typeof ROLE_CONFIG) ?? 'default'] ?? ROLE_CONFIG.default
    return {
      id: 'welcome',
      role: 'assistant',
      content: `Selam! 👋 I'm your **EthioCraft ${cfg.label}**.\n\n${cfg.hint}\n\nHow can I help you today?`,
      timestamp: new Date(),
    }
  }

  function buildAnonymousWelcome(): ChatMessage {
    return {
      id: 'welcome-anon',
      role: 'assistant',
      content: `Selam! 👋 Welcome to **EthioCraft**.\n\nI can help you browse our marketplace of authentic Ethiopian handcrafts.\n\nPlease **log in** to access personalised features like order tracking, cart management, and more.`,
      timestamp: new Date(),
    }
  }

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsTyping(true)

      // Not authenticated: show hint
      if (!sessionId) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'Please **log in** to chat with the AI assistant and access live marketplace data.',
              timestamp: new Date(),
            },
          ])
          setIsTyping(false)
        }, 600)
        return
      }

      try {
        const res = await apiFetch(
          `/ai/chat/sessions/${sessionId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmed }),
          }
        )

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))

          // Handle specific error codes
          if (res.status === 401) {
            throw new Error('Your session has expired. Please log in again.')
          }
          if (res.status === 403) {
            throw new Error('You do not have permission to access this information.')
          }
          if (res.status === 404) {
            // Session may have been closed — reinitialise
            clearStoredSessionId()
            setSessionId(null)
            throw new Error('This information is not available right now. Please try again.')
          }
          if (res.status >= 500) {
            throw new Error('The assistant is temporarily unavailable. Please try again in a moment.')
          }

          throw new Error(err?.message || 'This information is not available in the marketplace service right now.')
        }

        const json = await res.json()
        const assistantMsgRaw: BackendMessage = json.data?.assistantMessage

        const assistantMsg: ChatMessage = {
          id: assistantMsgRaw?.id ?? crypto.randomUUID(),
          role: 'assistant',
          content: assistantMsgRaw?.content ?? 'This information is not available right now.',
          timestamp: new Date(assistantMsgRaw?.createdAt ?? Date.now()),
          model: assistantMsgRaw?.metadata?.model,
          intent: assistantMsgRaw?.metadata?.intent,
          source: assistantMsgRaw?.metadata?.source,
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (err: any) {
        const errorContent =
          err?.message?.includes('not available') || err?.message?.includes('unavailable')
            ? err.message
            : 'This information is not available in the marketplace service right now. Please try again shortly.'

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'error',
            content: errorContent,
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsTyping(false)
      }
    },
    [sessionId, isTyping]
  )

  // ── Reset / new conversation ──────────────────────────────────────────────
  const resetConversation = useCallback(async () => {
    clearStoredSessionId()
    setSessionId(null)
    setMessages([])
    setInput('')
    setIsTyping(false)
    await initSession()
  }, [initSession])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating trigger button ────────────────────────────────────── */}
      <button
        id="chat-support-trigger"
        onClick={() => {
          setIsOpen(!isOpen)
          setIsMinimised(false)
        }}
        aria-label={isOpen ? 'Close chat' : 'Open AI assistant'}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full p-4 shadow-2xl transition-all duration-300',
          `bg-gradient-to-br ${cfg.color}`,
          'hover:scale-110 active:scale-95 text-white',
          isOpen && 'rotate-180'
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Chat window ────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="chat-support-window"
          className={cn(
            'fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl',
            'w-[min(calc(100vw-3rem),420px)]',
            'animate-in slide-in-from-bottom-4 duration-300',
            isMinimised ? 'h-[56px]' : 'h-[560px]'
          )}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div
            className={cn(
              'flex shrink-0 items-center justify-between px-4 py-3 text-white shadow-md',
              `bg-gradient-to-r ${cfg.color}`
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <RoleIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{cfg.label}</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-[10px] opacity-80">
                    {isInitialising ? 'Connecting…' : 'Powered by Gemini AI'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Reset button */}
              <button
                onClick={resetConversation}
                title="Start new conversation"
                className="rounded p-1.5 hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              {/* Minimise */}
              <button
                onClick={() => setIsMinimised((v) => !v)}
                title={isMinimised ? 'Expand' : 'Minimise'}
                className="rounded p-1.5 hover:bg-white/20 transition-colors"
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', isMinimised && 'rotate-180')}
                />
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="rounded p-1.5 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Body (hidden when minimised) ───────────────────────────── */}
          {!isMinimised && (
            <>
              {/* ── Error banner ─────────────────────────────────────── */}
              {sessionError && (
                <div className="shrink-0 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                  <span>⚠</span>
                  <span>{sessionError}</span>
                  <button
                    onClick={initSession}
                    className="ml-auto underline hover:no-underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* ── Messages area ──────────────────────────────────────── */}
              <div
                ref={scrollRef}
                className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 scroll-smooth"
              >
                {/* Initialising spinner */}
                {isInitialising && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-xs">Connecting to assistant…</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col',
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    {/* Avatar */}
                    {msg.role !== 'user' && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]',
                            `bg-gradient-to-br ${cfg.color}`
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-4 py-2.5 shadow-sm',
                        msg.role === 'user'
                          ? `bg-gradient-to-br ${cfg.color} text-white rounded-tr-none`
                          : msg.role === 'error'
                          ? 'border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 rounded-tl-none'
                          : 'border border-border bg-muted/60 text-foreground rounded-tl-none'
                      )}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="space-y-0.5">{renderContent(msg.content)}</div>
                      )}
                    </div>

                    {/* Footer row */}
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-2',
                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.role === 'assistant' && (
                        <ModelBadge source={msg.source} model={msg.model} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-white',
                        `bg-gradient-to-br ${cfg.color}`
                      )}
                    >
                      <RoleIcon className="h-3 w-3" />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-none border border-border bg-muted/60 px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Quick-action chips ─────────────────────────────────── */}
              {messages.length <= 1 && !isTyping && (
                <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-2">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Suggested
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map((action) => (
                      <button
                        key={action}
                        onClick={() => sendMessage(action)}
                        className={cn(
                          'rounded-full border border-border px-3 py-1 text-xs font-medium transition-all',
                          'hover:border-primary hover:bg-primary hover:text-primary-foreground',
                          'bg-background text-foreground'
                        )}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Input area ────────────────────────────────────────── */}
              <div className="shrink-0 border-t border-border bg-background p-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 pl-4 pr-2 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all">
                  <input
                    ref={inputRef}
                    id="chat-input"
                    type="text"
                    placeholder={
                      !sessionId
                        ? 'Log in to chat…'
                        : isTyping
                        ? 'Assistant is thinking…'
                        : 'Ask anything about EthioCraft…'
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(input)
                      }
                    }}
                    disabled={isTyping || isInitialising}
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                  />
                  <button
                    id="chat-send-button"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isTyping || isInitialising}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                      input.trim() && !isTyping
                        ? `bg-gradient-to-br ${cfg.color} text-white hover:opacity-90 active:scale-95 shadow`
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    {isTyping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
                  Powered by{' '}
                  <span className="font-medium text-foreground">Gemini AI</span>{' '}
                  · Falls back to Hugging Face · Live marketplace data
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}