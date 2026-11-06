import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/store/toast.store'
import { useMutation } from '@/store/commercialSync.store'
import { contactsApi, apiErrorInfo } from '@/services/commercial.service'
import { phoneDisplay } from '@/lib/commercial'
import { ErrorBlock, LoadingBlock, Section } from './shared'
import type { LegacyImportReport } from '@/types/commercial'

/** Prévia e importação idempotente de leads/clients legados para Contatos. */
export function LegacyImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [report, setReport] = useState<LegacyImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { busy, run } = useMutation()
  const toast = useToastStore()

  const load = () => {
    setLoading(true); setError(null)
    contactsApi.legacyPreview().then(setReport).catch((e) => setError(apiErrorInfo(e).message)).finally(() => setLoading(false))
  }
  useEffect(() => { if (open) load() }, [open])

  const apply = async () => {
    try {
      const r = await run(() => contactsApi.legacyApply())
      if (!r) return
      toast.success(`${r.created ?? 0} contato(s) importado(s).`, 'Leads e clientes legados não foram alterados.')
      setReport(r)
    } catch (e) { setError(apiErrorInfo(e).message) }
  }

  const s = report?.summary
  return (
    <Modal open={open} onClose={() => !busy && onClose()} size="lg" title="Importar leads e clientes legados"
      description="Cria contatos a partir dos cadastros antigos sem alterá-los. Conflitos ficam para revisão manual."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Fechar</Button>
          <Button variant="primary" loading={busy} disabled={!s || s.ready === 0} onClick={apply}>
            Importar {s?.ready ?? 0} contato(s)
          </Button>
        </div>
      }>
      {loading && <LoadingBlock />}
      {error && <ErrorBlock message={error} onRetry={load} />}
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
          {report!.withoutPhone.length > 0 && (
            <Section title="Sem telefone válido (telefone é obrigatório)">
              <p className="text-xs text-white/50">{report!.withoutPhone.map((r) => r.name).join(', ')}</p>
            </Section>
          )}
          {report!.created != null && <p className="text-sm text-emerald-300">{report!.created} contato(s) criado(s) nesta importação.</p>}
        </div>
      )}
    </Modal>
  )
}
