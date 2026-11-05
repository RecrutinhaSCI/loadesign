import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useServicesStore } from '@/store/services.store'
import { useMutation } from '@/store/commercialSync.store'
import { proposalsApi, apiErrorInfo } from '@/services/commercial.service'
import {
  brl, parseMoneyToCents, splitCents, addMonthsKey, formatDay, methodOptions, competenceOfKey,
  addCompetence, formatCompetence, PAYMENT_MODE, fromDateKey, toDateKey,
} from '@/lib/commercial'
import { FormError, Tabs } from './shared'
import type { PaymentMethod, PaymentMode, PaymentPlanInput, Proposal, WorkProjectDetail } from '@/types/commercial'

interface Props {
  open: boolean
  proposal: Proposal | null
  onClose: () => void
  onApproved?: (project: WorkProjectDetail) => void
}

const CUSTOM = '__custom__'

/** Primeira competência cujo vencimento (dia dueDay, limitado ao fim do mês) não é anterior ao início. */
function firstCompetence(startDate: string, dueDay: number) {
  const c = competenceOfKey(startDate)
  const due = addMonthsKey(`${c}-01`, 0, dueDay)
  return due < startDate ? addCompetence(c, 1) : c
}

export function ApproveModal({ open, proposal, onClose, onApproved }: Props) {
  const services = useServicesStore((s) => s.items)
  const fetchServices = useServicesStore((s) => s.fetch)
  const toast = useToastStore()
  const { busy, run } = useMutation()

  const [serviceId, setServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [finalValue, setFinalValue] = useState('')
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [mode, setMode] = useState<PaymentMode>('ONE_TIME')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  // à vista
  const [oneTimeDue, setOneTimeDue] = useState('')
  // parcelado
  const [count, setCount] = useState('2')
  const [firstDue, setFirstDue] = useState('')
  const [dueDates, setDueDates] = useState<string[]>([])
  // mensalidade
  const [dueDay, setDueDay] = useState('10')
  const [recStart, setRecStart] = useState('')
  const [recEnd, setRecEnd] = useState('')
  const [generateMonths, setGenerateMonths] = useState('1')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (open) void fetchServices() }, [open, fetchServices])

  useEffect(() => {
    if (!open || !proposal) return
    setError(null)
    setServiceId(proposal.serviceId ?? '')
    setServiceName(proposal.serviceId ? '' : proposal.serviceName ?? '')
    setFinalValue(proposal.estimatedValue != null ? proposal.estimatedValue.toFixed(2).replace('.', ',') : '')
    setProjectName(proposal.title)
    setDescription(proposal.description ?? '')
    setStartDate(''); setDueDate('')
    setMode('ONE_TIME'); setMethod('')
    setOneTimeDue(''); setCount('2'); setFirstDue(''); setDueDates([])
    setDueDay('10'); setRecStart(''); setRecEnd(''); setGenerateMonths('1')
  }, [open, proposal])

  const cents = parseMoneyToCents(finalValue || '')
  const n = Math.max(0, Math.min(48, parseInt(count, 10) || 0))

  // Recalcula vencimentos sugeridos (mensais) quando muda o 1º vencimento ou a quantidade
  useEffect(() => {
    if (!firstDue || n < 2) { setDueDates([]); return }
    setDueDates(Array.from({ length: n }, (_, i) => addMonthsKey(firstDue, i)))
  }, [firstDue, n])

  const parts = useMemo(() => (cents && n >= 2 ? splitCents(cents, n) : []), [cents, n])
  const recFirst = recStart && Number(dueDay) >= 1 && Number(dueDay) <= 31 ? firstCompetence(recStart, Number(dueDay)) : null

  const serviceOptions = [
    { value: '', label: 'Selecione…' },
    ...services.filter((s) => s.active || s.id === proposal?.serviceId).map((s) => ({ value: s.id, label: s.name })),
    { value: CUSTOM, label: 'Outro (descrever)' },
  ]

  const submit = async () => {
    if (!proposal) return
    setError(null)
    if (!cents || cents <= 0) { setError('Informe o valor final.'); return }
    const svc = serviceId && serviceId !== CUSTOM ? serviceId : null
    if (!svc && !serviceName.trim()) { setError('Confirme o serviço contratado.'); return }

    let payment: PaymentPlanInput
    const m = method || null
    if (mode === 'ONE_TIME') {
      if (!oneTimeDue) { setError('Informe o vencimento do pagamento à vista.'); return }
      payment = { mode, dueDate: oneTimeDue, method: m }
    } else if (mode === 'INSTALLMENTS') {
      if (n < 2) { setError('Parcelado exige pelo menos 2 parcelas.'); return }
      if (!firstDue || dueDates.length !== n || dueDates.some((d) => !d)) { setError('Informe os vencimentos das parcelas.'); return }
      payment = { mode, count: n, firstDueDate: firstDue, dueDates, method: m }
    } else {
      const day = Number(dueDay)
      if (!Number.isInteger(day) || day < 1 || day > 31) { setError('Dia de vencimento deve estar entre 1 e 31.'); return }
      if (!recStart) { setError('Informe a data de início da mensalidade.'); return }
      const months = Math.max(1, Math.min(24, parseInt(generateMonths, 10) || 1))
      payment = {
        mode, dueDay: day, startDate: recStart, endDate: recEnd || null, method: m,
        generateUntil: recFirst ? addCompetence(recFirst, months - 1) : null,
      }
    }

    try {
      const project = await run(() => proposalsApi.approve(proposal.id, {
        serviceId: svc, serviceName: svc ? null : serviceName.trim(), finalValue: cents / 100,
        projectName: projectName.trim() || null, description: description.trim() || null,
        startDate: startDate || null, dueDate: dueDate || null, payment,
      }))
      if (!project) return
      toast.success('Orçamento aprovado.', `Projeto oficializado com ${project.receivables.length} cobrança(s).`)
      onApproved?.(project)
      onClose()
    } catch (err) {
      setError(apiErrorInfo(err).message)
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="lg" title="Aprovar orçamento"
      description="Confirme o que foi contratado. O projeto será oficializado e as cobranças geradas."
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/35">Valor estimado original: {brl(proposal?.estimatedValue)}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
            <Button variant="primary" loading={busy} onClick={submit}>Aprovar e oficializar</Button>
          </div>
        </div>
      }>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Contratação</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select id="approve-service" label="Serviço contratado" value={serviceId} options={serviceOptions}
              onChange={(e) => setServiceId(e.target.value)} />
            <Input id="approve-value" label={mode === 'RECURRING' ? 'Valor mensal' : 'Valor final contratado'}
              value={finalValue} onChange={(e) => setFinalValue(e.target.value)} inputMode="decimal" placeholder="0,00" required />
          </div>
          {(serviceId === CUSTOM || (!serviceId && serviceName)) && (
            <Input id="approve-service-name" label="Descreva o serviço" value={serviceName} onChange={(e) => setServiceName(e.target.value)} maxLength={160} />
          )}
          <Input id="approve-project-name" label="Nome do projeto" value={projectName} onChange={(e) => setProjectName(e.target.value)} maxLength={160} />
          <Textarea id="approve-description" label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input id="approve-start" type="date" label="Início (opcional)" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input id="approve-due" type="date" label="Prazo de entrega (opcional)" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Pagamento</legend>
          <Tabs value={mode} onChange={setMode} items={(Object.keys(PAYMENT_MODE) as PaymentMode[]).map((v) => ({ value: v, label: PAYMENT_MODE[v] }))} />
          <Select id="approve-method" label="Forma de pagamento prevista (opcional)" value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod | '')} options={[{ value: '', label: 'Definir no recebimento' }, ...methodOptions]} />

          {mode === 'ONE_TIME' && (
            <Input id="approve-onetime-due" type="date" label="Vencimento" value={oneTimeDue} onChange={(e) => setOneTimeDue(e.target.value)} required />
          )}

          {mode === 'INSTALLMENTS' && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input id="approve-count" type="number" min={2} max={48} label="Quantidade de parcelas" value={count} onChange={(e) => setCount(e.target.value)} />
                <Input id="approve-first-due" type="date" label="1º vencimento" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
              </div>
              {parts.length > 0 && dueDates.length === n && (
                <div className="rounded-xl border border-dark-border overflow-hidden">
                  <table className="w-full text-xs">
                    <caption className="sr-only">Parcelas previstas</caption>
                    <thead className="bg-dark-muted/40 text-white/40"><tr><th className="px-3 py-2 text-left">Parcela</th><th className="px-3 py-2 text-left">Vencimento</th><th className="px-3 py-2 text-right">Valor</th></tr></thead>
                    <tbody>
                      {parts.map((p, i) => (
                        <tr key={i} className="border-t border-dark-border">
                          <td className="px-3 py-1.5 text-white/60">{i + 1}/{n}</td>
                          <td className="px-3 py-1.5">
                            <input type="date" aria-label={`Vencimento da parcela ${i + 1}`} className="input-base py-1 text-xs" value={dueDates[i]}
                              onChange={(e) => setDueDates((ds) => ds.map((d, j) => (j === i ? e.target.value : d)))} />
                          </td>
                          <td className="px-3 py-1.5 text-right text-white/80">{brl(p / 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-dark-border text-white/60"><td className="px-3 py-2" colSpan={2}>Total</td><td className="px-3 py-2 text-right font-medium">{brl(parts.reduce((a, b) => a + b, 0) / 100)}</td></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {mode === 'RECURRING' && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Input id="approve-due-day" type="number" min={1} max={31} label="Dia de vencimento" value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                  hint="29, 30 e 31 caem no último dia dos meses mais curtos" />
                <Input id="approve-rec-start" type="date" label="Início" value={recStart} onChange={(e) => setRecStart(e.target.value)} />
                <Input id="approve-rec-end" type="date" label="Término (opcional)" value={recEnd} onChange={(e) => setRecEnd(e.target.value)} />
              </div>
              <Input id="approve-generate" type="number" min={1} max={24} label="Gerar cobranças para quantos meses agora" value={generateMonths}
                onChange={(e) => setGenerateMonths(e.target.value)} hint="Os meses seguintes podem ser gerados depois, sob demanda, sem duplicar." />
              {recFirst && (
                <p className="text-xs text-white/45">
                  1ª cobrança: {formatCompetence(recFirst)} — vencimento {formatDay(toDateKey(fromDateKey(addMonthsKey(`${recFirst}-01`, 0, Number(dueDay)))))}
                </p>
              )}
            </div>
          )}
        </fieldset>

        <FormError message={error} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
