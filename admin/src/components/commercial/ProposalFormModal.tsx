import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Users, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useServicesStore } from '@/store/services.store'
import { useMutation } from '@/store/commercialSync.store'
import { contactsApi, proposalsApi, apiErrorInfo, duplicatesFrom } from '@/services/commercial.service'
import { CONTACT_TYPE, parseMoneyToCents, phoneDisplay } from '@/lib/commercial'
import { cn } from '@/lib/utils'
import { FormError, Tabs } from './shared'
import { DuplicateWarning } from './DuplicateWarning'
import type { Contact, ContactRef, ContactType, DuplicateCandidate, Proposal } from '@/types/commercial'

interface Props {
  open: boolean
  onClose: () => void
  proposal?: Proposal | null
  presetContact?: ContactRef | null
  onSaved?: (p: Proposal) => void
}

type Mode = 'existing' | 'new'

export function ProposalFormModal({ open, onClose, proposal, presetContact, onSaved }: Props) {
  const services = useServicesStore((s) => s.items)
  const fetchServices = useServicesStore((s) => s.fetch)
  const toast = useToastStore()
  const { busy, run } = useMutation()

  const [mode, setMode] = useState<Mode>('new')
  const [selected, setSelected] = useState<ContactRef | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Contact[]>([])
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', type: 'PROSPECT' as ContactType })
  const [form, setForm] = useState({ title: '', description: '', serviceId: '', estimatedValue: '' })
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null)

  const editing = Boolean(proposal)

  useEffect(() => { if (open) void fetchServices() }, [open, fetchServices])

  useEffect(() => {
    if (!open) return
    setError(null); setDuplicates(null); setSearch(''); setResults([])
    setNewContact({ name: '', phone: '', email: '', type: 'PROSPECT' })
    if (proposal) {
      setForm({
        title: proposal.title, description: proposal.description ?? '', serviceId: proposal.serviceId ?? '',
        estimatedValue: proposal.estimatedValue != null ? String(proposal.estimatedValue).replace('.', ',') : '',
      })
      setSelected({ id: proposal.contactId, name: proposal.contactName, phone: proposal.contactPhone })
      setMode('existing')
    } else {
      setForm({ title: '', description: '', serviceId: '', estimatedValue: '' })
      setSelected(presetContact ?? null)
      setMode(presetContact ? 'existing' : 'new')
    }
  }, [open, proposal, presetContact])

  // Busca de contatos existentes (debounce)
  useEffect(() => {
    if (mode !== 'existing' || selected || search.trim().length < 2) { setResults([]); return }
    const h = setTimeout(() => {
      contactsApi.list({ search, pageSize: 8 }).then((r) => setResults(r.items)).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(h)
  }, [search, mode, selected])

  const serviceOptions = useMemo(
    () => [{ value: '', label: 'Definir depois' }, ...services.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))],
    [services]
  )

  const submit = async (allowDuplicateContact = false) => {
    setError(null)
    let estimated: number | null = null
    if (form.estimatedValue.trim()) {
      const cents = parseMoneyToCents(form.estimatedValue)
      if (cents === null || cents <= 0) { setError('Valor estimado inválido.'); return }
      estimated = cents / 100
    }
    const base = {
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      serviceId: form.serviceId || null,
      estimatedValue: estimated,
    }
    try {
      let saved: Proposal | undefined
      if (editing && proposal) {
        saved = await run(() => proposalsApi.update(proposal.id, base))
      } else if (mode === 'existing') {
        if (!selected) { setError('Selecione um contato.'); return }
        saved = await run(() => proposalsApi.create({ ...base, contactId: selected.id }))
      } else {
        if (!newContact.name.trim() || !newContact.phone.trim()) { setError('Informe nome e telefone do contato.'); return }
        saved = await run(() => proposalsApi.create({
          ...base, allowDuplicateContact,
          contact: { name: newContact.name, phone: newContact.phone, email: newContact.email.trim() || null, type: newContact.type },
        }))
      }
      if (!saved) return
      toast.success(editing ? 'Orçamento atualizado.' : 'Orçamento criado — aguardando aprovação.')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      const dups = duplicatesFrom(err)
      if (dups) { setDuplicates(dups); return }
      setError(apiErrorInfo(err).message)
    }
  }

  const useExisting = (d: DuplicateCandidate) => {
    setSelected({ id: d.id, name: d.name, phone: d.phone, type: d.type })
    setMode('existing'); setDuplicates(null)
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="lg"
      title={editing ? 'Editar orçamento' : 'Novo orçamento'}
      description={editing ? 'Somente orçamentos pendentes podem ser editados.' : 'O valor estimado não gera cobrança nem receita.'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={() => submit(false)}>{editing ? 'Salvar' : 'Criar orçamento'}</Button>
        </div>
      }>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(false) }}>
        {/* Contato */}
        <fieldset className="space-y-3" disabled={editing}>
          <legend className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Contato</legend>
          {!editing && (
            <Tabs value={mode} onChange={(m) => { setMode(m); setDuplicates(null) }} items={[
              { value: 'new', label: 'Novo contato' },
              { value: 'existing', label: 'Contato existente' },
            ]} />
          )}

          {mode === 'existing' && (
            selected ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-loa-600/25 bg-loa-600/8 px-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <p className="text-white/85 font-medium truncate">{selected.name}</p>
                  <p className="text-xs text-white/40">{selected.phone ? phoneDisplay(selected.phone) : ''}{selected.type ? ` · ${CONTACT_TYPE[selected.type].label}` : ''}</p>
                </div>
                {!editing && (
                  <Button size="icon" variant="ghost" aria-label="Trocar contato" onClick={() => setSelected(null)}><X size={14} /></Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input id="proposal-contact-search" label="Buscar por nome, telefone ou e-mail" value={search}
                  onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={14} />} autoFocus />
                {results.length > 0 && (
                  <ul className="rounded-xl border border-dark-border divide-y divide-dark-border max-h-56 overflow-y-auto" role="listbox">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button type="button" role="option" aria-selected={false} onClick={() => setSelected(c)}
                          className="w-full text-left px-3 py-2 hover:bg-dark-hover focus-ring text-sm flex items-center justify-between gap-2">
                          <span className="truncate text-white/80">{c.name}</span>
                          <span className="text-xs text-white/35 shrink-0">{phoneDisplay(c.phone)} · {CONTACT_TYPE[c.type].label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim().length >= 2 && results.length === 0 && (
                  <p className="text-xs text-white/35 flex items-center gap-1.5"><Users size={12} /> Nenhum contato encontrado.
                    <button type="button" className="text-loa-400 hover:underline" onClick={() => setMode('new')}>Cadastrar novo</button></p>
                )}
              </div>
            )
          )}

          {mode === 'new' && !editing && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input id="proposal-contact-name" label="Nome" value={newContact.name} required autoFocus
                  onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))} />
                <Input id="proposal-contact-phone" label="Telefone / WhatsApp" value={newContact.phone} required inputMode="tel"
                  onChange={(e) => { setNewContact((c) => ({ ...c, phone: e.target.value })); setDuplicates(null) }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input id="proposal-contact-email" label="E-mail (opcional)" type="email" value={newContact.email}
                  onChange={(e) => { setNewContact((c) => ({ ...c, email: e.target.value })); setDuplicates(null) }} />
                <Select id="proposal-contact-type" label="Classificação" value={newContact.type}
                  onChange={(e) => setNewContact((c) => ({ ...c, type: e.target.value as ContactType }))}
                  options={[{ value: 'PROSPECT', label: 'Prospect' }, { value: 'CLIENT', label: 'Cliente' }]} />
              </div>
              {duplicates && (
                <DuplicateWarning duplicates={duplicates} busy={busy} onUse={useExisting}
                  confirmLabel="Criar novo contato mesmo assim" onConfirm={() => submit(true)} />
              )}
            </div>
          )}
        </fieldset>

        {/* Orçamento */}
        <fieldset className={cn('space-y-3')}>
          <legend className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5"><UserPlus size={12} /> Orçamento</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select id="proposal-service" label="Serviço / pacote (opcional)" value={form.serviceId}
              onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))} options={serviceOptions} />
            <Input id="proposal-estimated" label="Valor estimado (opcional)" value={form.estimatedValue} inputMode="decimal"
              placeholder="1.500,00" onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))} />
          </div>
          <Input id="proposal-title" label="Título (opcional)" value={form.title} maxLength={160}
            placeholder="Gerado automaticamente a partir do serviço e do contato" onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea id="proposal-description" label="Ideia / descrição sugerida" value={form.description} rows={4}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </fieldset>

        <FormError message={error} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
