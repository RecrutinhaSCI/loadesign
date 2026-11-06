import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useMutation } from '@/store/commercialSync.store'
import { contactsApi, apiErrorInfo, duplicatesFrom } from '@/services/commercial.service'
import { FormError } from './shared'
import { DuplicateWarning } from './DuplicateWarning'
import type { Contact, ContactType, DuplicateCandidate } from '@/types/commercial'

interface Props {
  open: boolean
  onClose: () => void
  contact?: Contact | null
  onSaved?: (c: Contact) => void
}

const empty = { name: '', phone: '', email: '', type: 'PROSPECT' as ContactType, source: '', notes: '' }

export function ContactFormModal({ open, onClose, contact, onSaved }: Props) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null)
  const { busy, run } = useMutation()
  const toast = useToastStore()

  useEffect(() => {
    if (!open) return
    setError(null); setDuplicates(null)
    setForm(contact ? {
      name: contact.name, phone: contact.phone, email: contact.email ?? '', type: contact.type,
      source: contact.source ?? '', notes: contact.notes ?? '',
    } : empty)
  }, [open, contact])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (k === 'phone' || k === 'email') setDuplicates(null)
  }

  const save = async (allowDuplicate = false) => {
    setError(null)
    if (!form.name.trim() || !form.phone.trim()) { setError('Nome e telefone são obrigatórios.'); return }
    const body = {
      name: form.name, phone: form.phone, email: form.email.trim() || null, type: form.type,
      source: form.source.trim() || null, notes: form.notes.trim() || null, allowDuplicate,
    }
    try {
      const saved = await run(() => (contact ? contactsApi.update(contact.id, body) : contactsApi.create(body)))
      if (!saved) return
      toast.success(contact ? 'Contato atualizado.' : 'Contato cadastrado.')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      const dups = duplicatesFrom(err)
      if (dups) { setDuplicates(dups); return }
      setError(apiErrorInfo(err).message)
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={contact ? 'Editar contato' : 'Novo contato'}
      description="Telefone é obrigatório; e-mail é opcional." size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={() => save(false)}>Salvar</Button>
        </div>
      }>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(false) }}>
        <Input id="contact-name" label="Nome" value={form.name} onChange={set('name')} required autoFocus maxLength={120} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input id="contact-phone" label="Telefone / WhatsApp" value={form.phone} onChange={set('phone')} required inputMode="tel" placeholder="(54) 99999-9999" />
          <Input id="contact-email" label="E-mail (opcional)" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select id="contact-type" label="Classificação" value={form.type} onChange={set('type')}
            options={[{ value: 'PROSPECT', label: 'Prospect' }, { value: 'CLIENT', label: 'Cliente' }]} />
          <Input id="contact-source" label="Origem (opcional)" value={form.source} onChange={set('source')} placeholder="Instagram, indicação…" />
        </div>
        <Textarea id="contact-notes" label="Observações" value={form.notes} onChange={set('notes')} rows={3} />
        {duplicates && (
          <DuplicateWarning duplicates={duplicates} busy={busy} onConfirm={() => save(true)} confirmLabel="Salvar mesmo assim" />
        )}
        <FormError message={error} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
