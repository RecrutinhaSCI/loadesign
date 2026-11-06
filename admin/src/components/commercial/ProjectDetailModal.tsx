import { useEffect, useState } from 'react'
import { Ban, CalendarPlus, Pause, Play, Square, RefreshCw, Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToastStore } from '@/store/toast.store'
import { useApiData, useMutation } from '@/store/commercialSync.store'
import { workProjectsApi, recurringApi, apiErrorInfo } from '@/services/commercial.service'
import {
  brl, formatDay, formatInstant, phoneDisplay, addCompetence, formatCompetence, todayKey, competenceOfKey,
  PROJECT_STATUS, PAYMENT_MODE, RECURRING_STATUS, PAYMENT_METHOD, EVENT_TYPE,
} from '@/lib/commercial'
import { ConfirmDialog, ErrorBlock, FormError, HistoryList, InfoRow, LoadingBlock, Section, StatusPill } from './shared'
import { ReceivablesTable } from './ReceivablesTable'
import { EventModal } from './EventModal'
import type { WorkProjectStatus } from '@/types/commercial'

interface Props {
  projectId: string | null
  onClose: () => void
  onOpenContact?: (id: string) => void
  onOpenProposal?: (id: string) => void
}

const EDITABLE: Exclude<WorkProjectStatus, 'CANCELLED'>[] = ['PLANNED', 'IN_PROGRESS', 'REVIEW', 'DONE']

export function ProjectDetailModal({ projectId, onClose, onOpenContact, onOpenProposal }: Props) {
  const { data: p, loading, error, reload } = useApiData(
    () => (projectId ? workProjectsApi.get(projectId) : Promise.resolve(null)), [projectId]
  )
  const [form, setForm] = useState({ status: 'PLANNED' as WorkProjectStatus, startDate: '', dueDate: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [genUntil, setGenUntil] = useState('')
  const { busy, run } = useMutation()
  const toast = useToastStore()

  useEffect(() => {
    if (!p) return
    setForm({ status: p.status, startDate: p.startDate ?? '', dueDate: p.dueDate ?? '' })
    setFormError(null)
    setGenUntil(addCompetence(competenceOfKey(todayKey()), 1))
  }, [p])

  const cancelled = p?.status === 'CANCELLED'
  const dirty = p && (form.status !== p.status || form.startDate !== (p.startDate ?? '') || form.dueDate !== (p.dueDate ?? ''))

  const save = async () => {
    if (!p) return
    setFormError(null)
    try {
      await run(() => workProjectsApi.update(p.id, {
        ...(form.status !== p.status ? { status: form.status as Exclude<WorkProjectStatus, 'CANCELLED'> } : {}),
        startDate: form.startDate || null, dueDate: form.dueDate || null,
      }))
      toast.success('Projeto atualizado.')
    } catch (err) { setFormError(apiErrorInfo(err).message) }
  }

  const recurringAction = async (fn: () => Promise<unknown>, msg: string) => {
    try { await run(fn); toast.success(msg) } catch (err) { toast.error('Não foi possível concluir', apiErrorInfo(err).message) }
  }

  const generateOptions = Array.from({ length: 12 }, (_, i) => {
    const c = addCompetence(competenceOfKey(todayKey()), i)
    return { value: c, label: formatCompetence(c) }
  })

  return (
    <Modal open={Boolean(projectId)} onClose={onClose} size="xl" title={p?.name ?? 'Projeto'}
      description={p ? `${p.serviceName} · oficializado em ${formatInstant(p.createdAt, { dateStyle: 'short' })}` : undefined}>
      {loading && !p && <LoadingBlock />}
      {error && <ErrorBlock message={error} onRetry={reload} />}
      {p && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-3">
            <Metric label={p.paymentMode === 'RECURRING' ? 'Contratado / mês' : 'Contratado'} value={brl(p.contractedValue)} />
            <Metric label="Estimado no orçamento" value={brl(p.proposal?.estimatedValue)} muted />
            <Metric label="A receber" value={brl(p.finance.pending)} tone="warning" />
            <Metric label="Recebido" value={brl(p.finance.received)} tone="success" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Projeto">
              <div>
                <InfoRow label="Contato">
                  <button className="text-loa-300 hover:underline focus-ring rounded" onClick={() => p.contact && onOpenContact?.(p.contact.id)}>{p.contact?.name}</button>
                  {p.contact?.phone ? <span className="text-white/35"> · {phoneDisplay(p.contact.phone)}</span> : null}
                </InfoRow>
                {p.proposal && (
                  <InfoRow label="Orçamento de origem">
                    <button className="text-loa-300 hover:underline focus-ring rounded" onClick={() => onOpenProposal?.(p.proposal!.id)}>{p.proposal.title}</button>
                  </InfoRow>
                )}
                <InfoRow label="Pagamento">{PAYMENT_MODE[p.paymentMode]}</InfoRow>
                <InfoRow label="Status"><StatusPill {...PROJECT_STATUS[p.status]} /></InfoRow>
                {p.deliveredAt && <InfoRow label="Entregue em">{formatInstant(p.deliveredAt, { dateStyle: 'short' })}</InfoRow>}
              </div>
              {p.description && <p className="text-sm text-white/60 whitespace-pre-wrap">{p.description}</p>}

              {!cancelled && (
                <div className="space-y-3 rounded-xl border border-dark-border p-3">
                  <Select id="project-status" label="Status operacional" value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as WorkProjectStatus }))}
                    options={EDITABLE.map((s) => ({ value: s, label: PROJECT_STATUS[s].label }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="project-start" type="date" label="Início" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                    <Input id="project-due" type="date" label="Prazo de entrega" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <FormError message={formError} />
                  <div className="flex justify-between gap-2">
                    <Button size="sm" variant="ghost" leftIcon={<Ban size={13} />} onClick={() => setCancelOpen(true)}>Cancelar projeto</Button>
                    <Button size="sm" variant="primary" leftIcon={<Save size={13} />} disabled={!dirty} loading={busy} onClick={save}>Salvar</Button>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Histórico">
              <div className="max-h-80 overflow-y-auto pr-1"><HistoryList items={p.history} /></div>
            </Section>
          </div>

          {p.recurring && (
            <Section title="Mensalidade">
              <div className="rounded-xl border border-dark-border p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                  <StatusPill {...RECURRING_STATUS[p.recurring.status]} />
                  <span>{brl(p.recurring.amount)}/mês · vence todo dia {p.recurring.dueDay}</span>
                  <span className="text-white/40">desde {formatDay(p.recurring.startDate)}{p.recurring.endDate ? ` até ${formatDay(p.recurring.endDate)}` : ''}</span>
                  {p.recurring.paymentMethod && <span className="text-white/40">· {PAYMENT_METHOD[p.recurring.paymentMethod]}</span>}
                </div>
                {p.recurring.status !== 'ENDED' && (
                  <div className="flex flex-wrap items-end gap-2">
                    {p.recurring.status === 'ACTIVE' && (
                      <>
                        <div className="w-56">
                          <Select id="recurring-until" label="Gerar cobranças até" value={genUntil} onChange={(e) => setGenUntil(e.target.value)} options={generateOptions} />
                        </div>
                        <Button size="sm" variant="primary" leftIcon={<RefreshCw size={13} />} loading={busy}
                          onClick={async () => {
                            try {
                              const r = await run(() => recurringApi.generate(p.recurring!.id, { until: genUntil }))
                              if (r) toast.success(r.created ? `${r.created} cobrança(s) gerada(s).` : 'Nenhuma cobrança nova: o período já estava gerado.')
                            } catch (err) { toast.error('Não foi possível gerar', apiErrorInfo(err).message) }
                          }}>Gerar</Button>
                        <Button size="sm" leftIcon={<Pause size={13} />} onClick={() => recurringAction(() => recurringApi.pause(p.recurring!.id), 'Mensalidade pausada.')}>Pausar</Button>
                      </>
                    )}
                    {p.recurring.status === 'PAUSED' && (
                      <Button size="sm" leftIcon={<Play size={13} />} onClick={() => recurringAction(() => recurringApi.resume(p.recurring!.id), 'Mensalidade reativada.')}>Reativar</Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<Square size={13} />} onClick={() => setEndOpen(true)}>Encerrar</Button>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Contas a receber">
            <div className="rounded-xl border border-dark-border overflow-hidden">
              <ReceivablesTable items={p.receivables.map((r) => ({ ...r, contact: p.contact, project: { id: p.id, name: p.name, status: p.status } }))} showContact={false} showProject={false} />
            </div>
          </Section>

          <Section title="Agenda do projeto" actions={!cancelled && <Button size="sm" leftIcon={<CalendarPlus size={13} />} onClick={() => setEventOpen(true)}>Agendar</Button>}>
            {p.events.length === 0 ? <p className="text-xs text-white/30">Nenhum compromisso vinculado.</p> : (
              <ul className="space-y-1.5">
                {p.events.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm text-white/70">
                    <span className={`w-2 h-2 rounded-full ${EVENT_TYPE[e.type].dot}`} />
                    <span className="text-white/45 w-36 shrink-0">{formatInstant(e.startsAt, e.allDay ? { dateStyle: 'short' } : undefined)}</span>
                    <span className="truncate">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      <ConfirmDialog open={cancelOpen} title="Cancelar projeto" reason="required" danger confirmLabel="Cancelar projeto"
        description="Cobranças pendentes serão canceladas e a mensalidade encerrada. Valores já recebidos são preservados."
        onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => { if (p) { await run(() => workProjectsApi.cancel(p.id, reason)); toast.success('Projeto cancelado.') } }} />
      <ConfirmDialog open={endOpen} title="Encerrar mensalidade" danger confirmLabel="Encerrar"
        description="Cobranças futuras ainda pendentes serão canceladas. Não é possível reativar depois."
        onClose={() => setEndOpen(false)}
        onConfirm={async () => { if (p?.recurring) { const r = await run(() => recurringApi.end(p.recurring!.id)); toast.success('Mensalidade encerrada.', r?.cancelledCharges ? `${r.cancelledCharges} cobrança(s) futura(s) cancelada(s).` : undefined) } }} />
      <EventModal open={eventOpen} onClose={() => setEventOpen(false)}
        preset={p ? { projectId: p.id, projectName: p.name, contactId: p.contactId, contactName: p.contact?.name } : undefined} />
    </Modal>
  )
}

function Metric({ label, value, tone, muted }: { label: string; value: string; tone?: 'success' | 'warning'; muted?: boolean }) {
  const color = tone === 'success' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-300' : muted ? 'text-white/50' : 'text-loa-300'
  return (
    <div className="rounded-xl border border-dark-border bg-dark-muted/20 px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wider text-white/35">{label}</p>
      <p className={`text-base font-semibold ${color}`}>{value}</p>
    </div>
  )
}
