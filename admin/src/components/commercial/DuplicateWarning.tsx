import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CONTACT_TYPE, phoneDisplay } from '@/lib/commercial'
import type { DuplicateCandidate } from '@/types/commercial'

interface Props {
  duplicates: DuplicateCandidate[]
  busy?: boolean
  confirmLabel: string
  onConfirm: () => void
  onUse?: (d: DuplicateCandidate) => void
}

/** Aviso de possível duplicidade: nada é mesclado automaticamente. */
export function DuplicateWarning({ duplicates, busy, confirmLabel, onConfirm, onUse }: Props) {
  return (
    <div role="alert" className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 space-y-2.5">
      <p className="flex items-center gap-2 text-sm text-amber-300">
        <AlertTriangle size={14} /> Já existe cadastro com este telefone ou e-mail.
      </p>
      <ul className="space-y-1.5">
        {duplicates.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 text-xs text-white/70">
            <span className="min-w-0 truncate">
              <strong className="text-white/85">{d.name}</strong> · {phoneDisplay(d.phone)}{d.email ? ` · ${d.email}` : ''} · {CONTACT_TYPE[d.type].label}
              {d.archivedAt ? ' · arquivado' : ''} <span className="text-amber-300/70">(mesmo {d.matchedBy.map((m) => (m === 'phone' ? 'telefone' : 'e-mail')).join(' e ')})</span>
            </span>
            {onUse && !d.archivedAt && <Button size="sm" variant="outline" onClick={() => onUse(d)}>Usar este</Button>}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  )
}
