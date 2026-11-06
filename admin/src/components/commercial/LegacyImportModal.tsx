import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToastStore } from '@/store/toast.store'
import { useMutation } from '@/store/commercialSync.store'
import { contactsApi, apiErrorInfo } from '@/services/commercial.service'
import { phoneDisplay } from '@/lib/commercial'
import { ErrorBlock, FormError, LoadingBlock, Section } from './shared'
import type { LegacyImportReport } from '@/types/commercial'

// Mesma regra do backend (utils/phone.js): só dígitos, sem 55 e zeros iniciais, 8 a 13 dígitos.
const normalize = (raw: string) => {
  let d = raw.replace(/\D/g, '').replace(/^0+/, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  return d
}
const validPhone = (raw: string) => { const n = normalize(raw); return n.length >= 8 && n.length <= 13 }

/**
 * Prévia e importação idempotente de leads/clients legados para Contatos.
 * Registros sem telefone válido podem receber um telefone aqui (usado só no
 * contato novo; o legado não muda) ou ficar para depois — repetir a
 * importação não duplica nada.
 */
export function LegacyImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [report, setReport] = useState<LegacyImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Telefones digitados (chave "lead:<id>" / "client:<id>") e os já aplicados à prévia.
  const [phones, setPhones] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<Record<string, string>>({})
  const { busy, run } = useMutation()
  const toast = useToastStore()

  const filled = Object.fromEntries(Object.entries(phones).filter(([, v]) => v.trim()))
  const invalidKeys = Object.keys(filled).filter((k) => !validPhone(filled[k]))
  const previewStale = JSON.stringify(filled) !== JSON.stringify(applied)

  const load = (withPhones: Record<string, string> = {}) => {
    setLoading(true); setError(null)
    contactsApi.legacyPreview(withPhones)
      .then((r) => { setReport(r); setApplied(withPhones) })
      .catch((e) => setError(apiErrorInfo(e).message))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    if (open) { setPhones({}); setApplied({}); load() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const apply = async () => {
    try {
      const r = await run(() => contactsApi.legacyApply(applied))
      if (!r) return
      toast.success(`${r.created ?? 0} contato(s) importado(s).`, 'Leads e clientes legados não foram alterados.')
      setReport(r); setPhones({}); setApplied({})
    } catch (e) { setError(apiErrorInfo(e).message) }
  }

  const s = report?.summary
  // Registros que estavam sem telefone e receberam um na prévia atual.
  const corrected = report?.ready.filter((g) => g.phoneOverridden) ?? []
  const pending = report?.withoutPhone ?? []
  const shownWithoutPhone = [...pending, ...corrected.flatMap((g) => g.records.filter((r) => r.phoneOverridden))]

  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="lg" title="Importar leads e clientes legados"
      description="Cria contatos a partir dos cadastros antigos sem alterá-los. Conflitos ficam para revisão manual."
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {previewStale && <span className="text-xs text-amber-300/80 mr-auto">Atualize a prévia para incluir os telefones digitados.</span>}
          <Button variant="ghost" onClick={onClose} disabled={busy}>Fechar</Button>
          <Button variant="primary" loading={busy} disabled={!s || s.ready === 0 || previewStale || loading} onClick={apply}>
            Importar {s?.ready ?? 0} contato(s)
          </Button>
        </div>
      }>
      {loading && <LoadingBlock />}
      {error && <ErrorBlock message={error} onRetry={() => load(applied)} />}
      {s && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            {[
              ['Leads legados', s.leads], ['Clientes legados', s.clients], ['Já importados', s.alreadyImported],
              ['Prontos', s.ready], ['Conflitos', s.conflicts], ['Sem telefone', s.withoutPhone],
            ].map(([label, n]) => (
              <div key={label as string} className="rounded-xl border border-dark-border px-2 py-2">
                <p className="text-lg font-semibold text-white/85">{n}</p>
                <p className="text-2xs uppercase tracking-wider text-white/35">{label}</p>
              </div>
            ))}
          </div>

          {report!.ready.length > 0 && (
            <Section title="Prontos para importar">
              <ul className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                {report!.ready.map((g) => (
                  <li key={g.phoneNormalized} className="flex flex-wrap items-center gap-x-2 rounded-lg border border-dark-border px-3 py-1.5">
                    <span className="text-white/75">{g.records.map((r) => `${r.name} (${r.kind === 'client' ? 'cliente' : 'lead'})`).join(' + ')}</span>
                    <span className="text-white/40">{phoneDisplay(g.phoneNormalized)}</span>
                    {g.phoneOverridden && <span className="text-2xs text-sky-300/80">telefone informado agora</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report!.conflicts.length > 0 && (
            <Section title="Conflitos (não serão importados)">
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {report!.conflicts.map((c) => (
                  <li key={c.phoneNormalized} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                    <p className="text-amber-200/90">{phoneDisplay(c.phoneNormalized)} — {c.reasons.join('; ')}</p>
                    <p className="text-white/50">{c.records.map((r) => `${r.name} (${r.kind === 'client' ? 'cliente' : 'lead'})`).join(', ')}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {shownWithoutPhone.length > 0 && (
            <Section title="Sem telefone válido (telefone é obrigatório)"
              actions={
                <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={12} />} disabled={invalidKeys.length > 0 || loading || !previewStale}
                  onClick={() => load(filled)}>Atualizar prévia</Button>
              }>
              <p className="text-xs text-white/45 mb-2">
                Informe um telefone para importar agora, ou deixe em branco para importar depois.
                O número é usado só no contato novo; o cadastro antigo não muda.
              </p>
              <ul className="space-y-2">
                {shownWithoutPhone.map((r) => {
                  const key = `${r.kind}:${r.id}`
                  const value = phones[key] ?? applied[key] ?? ''
                  const bad = value.trim() !== '' && !validPhone(value)
                  return (
                    <li key={key} className="grid gap-2 sm:grid-cols-[1fr_220px] items-start">
                      <div className="text-xs pt-2">
                        <p className="text-white/75">{r.name} <span className="text-white/35">({r.kind === 'client' ? 'cliente' : 'lead'})</span></p>
                        {'email' in r && r.email && <p className="text-white/35">{r.email}</p>}
                      </div>
                      <Input id={`legacy-phone-${key}`} aria-label={`Telefone de ${r.name}`} placeholder="(54) 99999-0000" inputMode="tel"
                        value={value} error={bad ? 'Telefone inválido' : undefined}
                        onChange={(e) => setPhones({ ...phones, [key]: e.target.value })} />
                    </li>
                  )
                })}
              </ul>
              <FormError message={invalidKeys.length ? 'Corrija os telefones inválidos para atualizar a prévia.' : null} />
            </Section>
          )}

          {report!.created != null && <p className="text-sm text-emerald-300">{report!.created} contato(s) criado(s) nesta importação.</p>}
        </div>
      )}
    </Modal>
  )
}
