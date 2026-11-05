import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useMutation } from '@/store/commercialSync.store'
import { calendarApi, contactsApi, workProjectsApi, apiErrorInfo } from '@/services/commercial.service'
import { EVENT_TYPE, fromDateKey, isoToLocalInput, localInputToISO, toDateKey } from '@/lib/commercial'
import { FormError } from './shared'
import type { CalendarEvent, CalendarEventType } from '@/types/commercial'

interface Preset { date?: string; contactId?: string; contactName?: string; projectId?: string; projectName?: string }

interface Props {
  open: boolean
  onClose: () => void
  event?: CalendarEvent | null
  preset?: Preset
}

const TYPES = Object.keys(EVENT_TYPE) as CalendarEventType[]

export function EventModal({ open, onClose, event, preset }: Props) {
  const [form, setForm] = useState({
    title: '', type: 'MEETING' as CalendarEventType, allDay: false, start: '', end: '', date: '',
    location: '', notes: '', contactId: '', projectId: '',
  })
  const [contacts, setContacts] = useState<Array<{ value: string; label: string }>>([])
  const [projects, setProjects] = useState<Array<{ value: string; label: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const { busy, run } = useMutation()
  const toast = useToastStore()

  useEffect(() => {
    if (!open) return
    setError(null)
    if (event) {
      setForm({
        title: event.title, type: event.type, allDay: event.allDay,
        start: event.allDay ? '' : isoToLocalInput(event.startsAt),
        end: event.endsAt && !event.allDay ? isoToLocalInput(event.endsAt) : '',
        date: event.allDay ? toDateKey(new Date(event.startsAt)) : '',
        location: event.location ?? '', notes: event.notes ?? '',
        contactId: event.contactId ?? '', projectId: event.projectId ?? '',
      })
    } else {
      setForm({
        title: '', type: 'MEETING', allDay: false, start: preset?.date ? `${preset.date}T09:00` : '', end: '', date: preset?.date ?? '',
        location: '', notes: '', contactId: preset?.contactId ?? '', projectId: preset?.projectId ?? '',
      })
    }
    // Opções de vínculo: contatos e projetos ativos reais
    contactsApi.list({ pageSize: 100 }).then((r) => setContacts(r.items.map((c) => ({ value: c.id, label: c.name })))).catch(() => setContacts([]))
    workProjectsApi.list({ status: 'ACTIVE', pageSize: 100 }).then((r) => setProjects(r.items.map((p) => ({ value: p.id, label: p.name })))).catch(() => setProjects([]))
  }, [open, event, preset])

  const withCurrent = (opts: Array<{ value: string; label: string }>, id: string, name?: string) =>
    id && !opts.some((o) => o.value === id) ? [{ value: id, label: name ?? 'Vinculado' }, ...opts] : opts

  const submit = async () => {
    setError(null)
    if (!form.title.trim()) { setError('Informe o título.'); return }
    let startsAt: string
    let endsAt: string | null = null
    if (form.allDay) {
      if (!form.date) { setError('Informe a data.'); return }
      startsAt = fromDateKey(form.date).toISOString() // meia-noite local
    } else {
      if (!form.start) { setError('Informe data e hora de início.'); return }
      startsAt = localInputToISO(form.start)
      if (form.end) {
        endsAt = localInputToISO(form.end)
        if (endsAt < startsAt) { setError('O término deve ser depois do início.'); return }
      }
    }
    const body = {
      title: form.title.trim(), type: form.type, allDay: form.allDay, startsAt, endsAt,
      location: form.location.trim() || null, notes: form.notes.trim() || null,
      contactId: form.contactId || null, projectId: form.projectId || null,
    }
    try {
      const saved = await run(() => (event ? calendarApi.update(event.id, body) : calendarApi.create(body)))
      if (!saved) return
      toast.success(event ? 'Compromisso atualizado.' : 'Compromisso agendado.')
      onClose()
    } catch (err) { setError(apiErrorInfo(err).message) }
  }

  const setStatus = async (status: 'DONE' | 'CANCELLED') => {
    if (!event) return
    try {
      await run(() => calendarApi.update(event.id, { status }))
      toast.success(status === 'DONE' ? 'Compromisso concluído.' : 'Compromisso cancelado.')
      onClose()
    } catch (err) { setError(apiErrorInfo(err).message) }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="md" title={event ? 'Editar compromisso' : 'Novo compromisso'}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {event && event.status === 'SCHEDULED' && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setStatus('DONE')} disabled={busy}>Concluir</Button>
                <Button size="sm" variant="danger" onClick={() => setStatus('CANCELLED')} disabled={busy}>Cancelar compromisso</Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Fechar</Button>
            <Button variant="primary" loading={busy} onClick={submit}>Salvar</Button>
          </div>
        </div>
      }>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <Input id="event-title" label="Título" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus maxLength={160} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Select id="event-type" label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CalendarEventType }))}
            options={TYPES.map((t) => ({ value: t, label: EVENT_TYPE[t].label }))} />
          <label className="flex items-center gap-2 text-sm text-white/60 mt-6">
            <input id="event-all-day" type="checkbox" aria-label="Dia inteiro" checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} className="accent-loa-600" />
            Dia inteiro
          </label>
        </div>
        {form.allDay ? (
          <Input id="event-date" type="date" label="Data" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input id="event-start" type="datetime-local" label="Início" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
            <Input id="event-end" type="datetime-local" label="Término (opcional)" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Select id="event-contact" label="Contato (opcional)" value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
            options={[{ value: '', label: 'Sem vínculo' }, ...withCurrent(contacts, form.contactId, preset?.contactName ?? event?.contact?.name)]} />
          <Select id="event-project" label="Projeto (opcional)" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            options={[{ value: '', label: 'Sem vínculo' }, ...withCurrent(projects, form.projectId, preset?.projectName ?? event?.project?.name)]} />
        </div>
        <Input id="event-location" label="Local / link (opcional)" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <Textarea id="event-notes" label="Observações" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        <FormError message={error} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
