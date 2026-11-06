import { create } from 'zustand'
import { ContactDetailModal } from './ContactDetailModal'
import { ProposalDetailModal } from './ProposalDetailModal'
import { ProjectDetailModal } from './ProjectDetailModal'

// ─────────────────────────────────────────────────────────────────────────────
// Um único painel de detalhe aberto por vez (contato, orçamento ou projeto).
// Navegar entre eles (ex.: do orçamento para o projeto gerado) troca o painel
// em vez de empilhar modais.
// ─────────────────────────────────────────────────────────────────────────────

type Kind = 'contact' | 'proposal' | 'project'
interface DetailState {
  current: { kind: Kind; id: string } | null
  open: (kind: Kind, id: string) => void
  close: () => void
}

export const useDetail = create<DetailState>()((set) => ({
  current: null,
  open: (kind, id) => set({ current: { kind, id } }),
  close: () => set({ current: null }),
}))

export function DetailHost() {
  const { current, open, close } = useDetail()
  const id = (k: Kind) => (current?.kind === k ? current.id : null)
  const nav = {
    onOpenContact: (i: string) => open('contact', i),
    onOpenProposal: (i: string) => open('proposal', i),
    onOpenProject: (i: string) => open('project', i),
  }
  return (
    <>
      <ContactDetailModal contactId={id('contact')} onClose={close} onOpenProposal={nav.onOpenProposal} onOpenProject={nav.onOpenProject} />
      <ProposalDetailModal proposalId={id('proposal')} onClose={close} onOpenContact={nav.onOpenContact} onOpenProject={nav.onOpenProject} />
      <ProjectDetailModal projectId={id('project')} onClose={close} onOpenContact={nav.onOpenContact} onOpenProposal={nav.onOpenProposal} />
    </>
  )
}
