import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Search, Mail, Phone, Archive, CheckCheck, RotateCcw, Trash2, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog, ErrorBlock, LoadingBlock, Pagination, StatusPill, Tabs, InfoRow, FormError } from '@/components/commercial/shared'
import { useApiData } from '@/store/commercialSync.store'
import { messagesApi, type MessageStatus, type SiteMessage } from '@/services/messages.service'
import { apiErrorInfo } from '@/services/commercial.service'
import { formatInstant, phoneDisplay, type Tone } from '@/lib/commercial'

// ─────────────────────────────────────────────────────────────────────────────
// Mensagens do formulário do site. Cada mensagem já gerou um lead (Leads do
// site); aqui a Laura lê o texto original, marca como lida/arquivada e, se
// necessário (pedido de exclusão de dados), remove a mensagem.
// ─────────────────────────────────────────────────────────────────────────────

type Filter = MessageStatus | 'all'
const STATUS: Record<MessageStatus, { label: string; tone: Tone }> = {
  NEW: { label: 'Nova', tone: 'info' },
  READ: { label: 'Lida', tone: 'muted' },
  ARCHIVED: { label: 'Arquivada', tone: 'default' },
}
const PAGE_SIZE = 20
const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^(?!55)/, '55')}`

export function MessagesPage() {
  const [filter, setFilter] = useState<Filter>('NEW')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<SiteMessage | null>(null)

  useEffect(() => { const h = setTimeout(() => { setDebounced(search); setPage(1) }, 300); return () => clearTimeout(h) }, [search])

  const { data, loading, error, reload } = useApiData(
    () => messagesApi.list({ status: filter, search: debounced || undefined, page, pageSize: PAGE_SIZE }),
    [filter, debounced, page]
  )
  const counts = data?.counts
  const meta = data ? { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: Math.max(1, Math.ceil(data.total / data.pageSize)) } : undefined

  const openMessage = async (m: SiteMessage) => {
    setOpen(m)
    // Abrir uma mensagem nova a marca como lida (ação reversível).
    if (m.status === 'NEW') {
      try { setOpen(await messagesApi.setStatus(m.id, 'READ')); reload() } catch { /* mantém aberta como nova */ }
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Mensagens do site" description="Recebidas pelo formulário de contato. Cada mensagem também aparece em Leads do site."
        actions={<Link to="/leads" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 focus-ring rounded">Ver leads do site</Link>} />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs<Filter> value={filter} onChange={(v) => { setFilter(v); setPage(1) }} items={[
          { value: 'NEW', label: 'Novas', count: counts?.NEW },
          { value: 'READ', label: 'Lidas', count: counts?.READ },
          { value: 'ARCHIVED', label: 'Arquivadas', count: counts?.ARCHIVED },
          { value: 'all', label: 'Todas', count: counts ? counts.NEW + counts.READ + counts.ARCHIVED : undefined },
        ]} />
        <div className="flex-1 min-w-[220px]">
          <Input id="messages-search" aria-label="Buscar mensagens" placeholder="Buscar por nome, telefone, e-mail ou texto" value={search}
            onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={14} />} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !data && <LoadingBlock />}
        {error && <ErrorBlock message={error} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <EmptyState icon={Inbox}
            title={debounced ? 'Nenhuma mensagem encontrada' : filter === 'NEW' ? 'Nenhuma mensagem nova' : 'Nenhuma mensagem nesta visão'}
            description="As mensagens enviadas pelo formulário do site aparecem aqui." />
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-dark-border">
            {data.items.map((m) => (
              <li key={m.id}>
                <button onClick={() => openMessage(m)} className="w-full text-left px-4 py-3 hover:bg-dark-hover/40 focus-ring flex flex-col gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={m.status === 'NEW' ? 'font-semibold text-white/90 truncate' : 'text-white/75 truncate'}>{m.name}</span>
                    <StatusPill {...STATUS[m.status] ?? STATUS.NEW} />
                    <span className="ml-auto text-2xs text-white/35 whitespace-nowrap">{formatInstant(m.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-white/45">
                    <span>{phoneDisplay(m.phone)}</span>
                    {m.service && <span>{m.service}</span>}
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 break-words">{m.message}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={meta} onPage={setPage} />
      </div>

      <MessageModal message={open} onClose={() => setOpen(null)} onChanged={(m) => { setOpen(m); reload() }} onRemoved={() => { setOpen(null); reload() }} />
    </div>
  )
}

function MessageModal({ message, onClose, onChanged, onRemoved }: {
  message: SiteMessage | null
  onClose: () => void
  onChanged: (m: SiteMessage) => void
  onRemoved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  useEffect(() => { setError(null) }, [message?.id])
  if (!message) return null

  const change = async (status: MessageStatus) => {
    setBusy(true); setError(null)
    try { onChanged(await messagesApi.setStatus(message.id, status)) }
    catch (e) { setError(apiErrorInfo(e).message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <Modal open={!!message} onClose={() => !busy && onClose()} title={message.name}
        description={`Recebida em ${formatInstant(message.createdAt, { dateStyle: 'long', timeStyle: 'short' })}`} size="md"
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => setConfirmRemove(true)} disabled={busy}>Remover</Button>
            <div className="flex flex-wrap gap-2">
              {message.status !== 'NEW' && <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={13} />} loading={busy} onClick={() => change('NEW')}>Marcar como nova</Button>}
              {message.status !== 'READ' && <Button variant="ghost" size="sm" leftIcon={<CheckCheck size={13} />} loading={busy} onClick={() => change('READ')}>Marcar como lida</Button>}
              {message.status !== 'ARCHIVED' && <Button variant="primary" size="sm" leftIcon={<Archive size={13} />} loading={busy} onClick={() => change('ARCHIVED')}>Arquivar</Button>}
            </div>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoRow label="Telefone">
              <a className="inline-flex items-center gap-1.5 text-loa-300 hover:underline" href={waLink(message.phone)} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={12} /> {phoneDisplay(message.phone)}
              </a>
            </InfoRow>
            <InfoRow label="E-mail">
              {message.email
                ? <a className="inline-flex items-center gap-1.5 text-loa-300 hover:underline" href={`mailto:${message.email}`}><Mail size={12} /> {message.email}</a>
                : <span className="text-white/35">—</span>}
            </InfoRow>
            <InfoRow label="Instagram">{message.instagram || <span className="text-white/35">—</span>}</InfoRow>
            <InfoRow label="Serviço">{message.service || <span className="text-white/35">—</span>}</InfoRow>
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-white/35 mb-1.5">Mensagem</p>
            {/* Texto puro (React escapa o conteúdo): nada do formulário é interpretado como HTML. */}
            <p className="text-sm text-white/80 whitespace-pre-wrap break-words bg-dark-muted/30 rounded-xl p-3">{message.message}</p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-white/35"><Phone size={12} /> O lead correspondente está em Leads do site.</p>
          <FormError message={error} />
        </div>
      </Modal>
      <ConfirmDialog open={confirmRemove} danger title="Remover mensagem?" confirmLabel="Remover definitivamente" note="Esta ação não pode ser desfeita."
        description="A mensagem será apagada de forma permanente (por exemplo, a pedido do remetente). O lead gerado por ela não é removido."
        onClose={() => setConfirmRemove(false)}
        onConfirm={async () => { await messagesApi.remove(message.id); onRemoved() }} />
    </>
  )
}
