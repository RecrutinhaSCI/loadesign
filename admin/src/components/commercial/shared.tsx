import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, History, AlertTriangle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import { formatInstant, type Tone } from '@/lib/commercial'
import type { HistoryEntry, PageMeta } from '@/types/commercial'
import { apiErrorInfo } from '@/services/commercial.service'

// ─── Pill de status ──────────────────────────────────────────────────────────
export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <Badge variant={tone} dot>{label}</Badge>
}

// ─── Estados de carregamento / erro / vazio ──────────────────────────────────
export function LoadingBlock({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/40" role="status" aria-live="polite">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertTriangle size={18} className="text-red-400" />
      <p className="text-sm text-red-300/80">{message}</p>
      {onRetry && <Button size="sm" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  )
}

// ─── Paginação ───────────────────────────────────────────────────────────────
export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3 px-5 py-3 border-t border-dark-border text-xs text-white/40">
      <span>{meta.total} registro(s) · página {meta.page} de {meta.totalPages}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" aria-label="Página anterior" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={14} /></Button>
        <Button size="icon" variant="ghost" aria-label="Próxima página" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}><ChevronRight size={14} /></Button>
      </div>
    </nav>
  )
}

// ─── Histórico ───────────────────────────────────────────────────────────────
export function HistoryList({ items }: { items: HistoryEntry[] }) {
  if (!items.length) return <p className="text-xs text-white/30">Sem histórico registrado.</p>
  return (
    <ol className="space-y-2.5">
      {items.map((h) => (
        <li key={h.id} className="flex gap-2.5 text-xs">
          <History size={12} className="mt-0.5 shrink-0 text-white/25" />
          <div className="min-w-0">
            <p className="text-white/70 break-words">{h.message}</p>
            <p className="text-white/25">{formatInstant(h.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ─── Seção com título ────────────────────────────────────────────────────────
export function Section({ title, actions, children, className }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm border-b border-dark-border/60 last:border-0">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="text-white/80 text-right min-w-0 break-words">{children}</span>
    </div>
  )
}

// ─── Mensagem de erro de formulário ──────────────────────────────────────────
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{message}</p>
}

// ─── Diálogo de confirmação (com motivo opcional/obrigatório) ────────────────
interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  reason?: 'none' | 'optional' | 'required'
  reasonLabel?: string
  /** Texto exibido quando não há motivo. `null` oculta (ex.: ação sem histórico). */
  note?: string | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', danger, reason = 'none', reasonLabel = 'Motivo', note, onClose, onConfirm }: ConfirmDialogProps) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => { if (busy) return; setText(''); setError(null); onClose() }
  const submit = async () => {
    if (reason === 'required' && text.trim().length < 3) { setError('Informe o motivo (mínimo 3 caracteres).'); return }
    setBusy(true); setError(null)
    try {
      await onConfirm(text.trim())
      setText('')
      onClose()
    } catch (err) {
      setError(apiErrorInfo(err).message || 'Não foi possível concluir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={title} description={description} size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={busy}>Voltar</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={submit}>{confirmLabel}</Button>
        </div>
      }>
      <div className="space-y-3">
        {reason !== 'none' && (
          <Textarea label={`${reasonLabel}${reason === 'optional' ? ' (opcional)' : ''}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus />
        )}
        {reason === 'none' && note !== null && <p className="text-sm text-white/60">{note ?? 'Esta ação ficará registrada no histórico.'}</p>}
        <FormError message={error} />
      </div>
    </Modal>
  )
}

// ─── Abas simples acessíveis ─────────────────────────────────────────────────
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: Array<{ value: T; label: string; count?: number }> }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 p-1 rounded-xl bg-dark-card border border-dark-border w-fit">
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring',
            value === it.value ? 'bg-loa-600/20 text-loa-300' : 'text-white/45 hover:text-white/80')}>
          {it.label}{it.count != null && <span className="ml-1.5 text-white/30">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}
