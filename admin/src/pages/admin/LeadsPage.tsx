import { useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { LeadsTable } from '@/components/admin/LeadsTable'
import { LeadFormModal } from '@/components/admin/LeadFormModal'
import { Button } from '@/components/ui/Button'
import { useLeadsStore } from '@/store/leads.store'
import { useToastStore } from '@/store/toast.store'
import type { Lead } from '@/types'

export function LeadsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const { items: leads } = useLeadsStore()
  const toast = useToastStore()

  const handleNew = () => { setEditing(null); setFormOpen(true) }
  const handleEdit = (lead: Lead) => { setEditing(lead); setFormOpen(true) }

  const handleExport = () => {
    if (leads.length === 0) {
      toast.error('Não há leads para exportar.')
      return
    }
    const headers = ['Nome', 'E-mail', 'Telefone', 'Empresa', 'Serviço', 'Status', 'Valor', 'Criado em']
    const rows = leads.map((l) => [
      l.name, l.email, l.phone ?? '', l.company ?? '',
      l.service, l.status, l.value.toString(),
      new Date(l.createdAt).toLocaleDateString('pt-BR'),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leads-loa-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Leads exportados.')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads · CRM"
        description="Funil de prospecção e atendimento da Loa Design"
        actions={
          <>
            <Button variant="outline" size="sm" leftIcon={<Download size={13} />} onClick={handleExport}>
              Exportar CSV
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={handleNew}>
              Novo lead
            </Button>
          </>
        }
      />

      <LeadsTable onEdit={handleEdit} />

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} lead={editing} />
    </div>
  )
}
