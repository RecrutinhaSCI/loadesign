import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, Briefcase, TrendingUp,
  AlertCircle, ArrowRight, Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/admin/PageHeader'
import { StatCard } from '@/components/admin/StatCard'
import { Button } from '@/components/ui/Button'

import { RevenueChart } from '@/components/admin/RevenueChart'
import { ProjectStatus } from '@/components/admin/ProjectStatus'
import { FinanceOverview } from '@/components/admin/FinanceOverview'
import { RecentLeads } from '@/components/admin/RecentLeads'
import { RecentActivity } from '@/components/admin/RecentActivity'
import { ProjectModal } from '@/components/admin/ProjectModal'

import { useLeadsStore } from '@/store/leads.store'
import { useProjectsStore } from '@/store/projects.store'
import { useClientsStore } from '@/store/clients.store'
import { useTransactionsStore } from '@/store/transactions.store'

import { formatCurrency, formatPercent } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Banner — leads novos a contatar
// ─────────────────────────────────────────────────────────────────────────────
function NewLeadsBanner({ count }: { count: number }) {
  const navigate = useNavigate()
  if (count === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-loa-600/8 border border-loa-600/20 mb-6"
    >
      <div className="relative shrink-0">
        <span className="absolute inset-0 rounded-full bg-loa-500 animate-ping opacity-60" />
        <AlertCircle size={15} className="relative text-loa-400" />
      </div>
      <p className="flex-1 text-sm text-white/70">
        Você tem{' '}
        <span className="font-semibold text-loa-400">
          {count} {count === 1 ? 'novo lead' : 'novos leads'}
        </span>{' '}
        aguardando contato.
      </p>
      <Button
        variant="outline"
        size="sm"
        rightIcon={<ArrowRight size={12} />}
        onClick={() => navigate('/leads')}
        className="shrink-0"
      >
        Ver leads
      </Button>
    </motion.div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/25 whitespace-nowrap">
        {label}
      </p>
      <div className="flex-1 h-px bg-dark-border" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { items: leads } = useLeadsStore()
  const { items: projects } = useProjectsStore()
  const { items: clients } = useClientsStore()
  const { items: transactions } = useTransactionsStore()

  const [projectModal, setProjectModal] = useState(false)

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const metrics = useMemo(() => {
    const newLeads = leads.filter((l) => l.status === 'new').length
    const inProgressProjects = projects.filter(
      (p) => p.status === 'IN_PROGRESS' || p.status === 'REVIEW' || p.status === 'DRAFT'
    ).length
    const wonLeads = leads.filter((l) => l.status === 'won').length
    const lostLeads = leads.filter((l) => l.status === 'lost').length
    const closed = wonLeads + lostLeads
    const conversionRate = closed > 0 ? (wonLeads / closed) * 100 : 0

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthRevenue = transactions
      .filter((t) => t.type === 'income' && new Date(t.date) >= startOfMonth)
      .reduce((s, t) => s + t.value, 0)

    return {
      newLeads,
      totalLeads: leads.length,
      activeClients: clients.length,
      inProgressProjects,
      conversionRate,
      monthRevenue,
    }
  }, [leads, projects, clients, transactions])

  return (
    <div className="space-y-0">
      <PageHeader
        title="Visão geral"
        description={`Olá, Loa 🤍 · ${today}`}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Sparkles size={13} />}
            onClick={() => setProjectModal(true)}
          >
            Novo projeto
          </Button>
        }
      />

      <NewLeadsBanner count={metrics.newLeads} />

      <SectionLabel label="Painel da operação" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          title="Leads no funil"
          value={metrics.totalLeads}
          subtitle={`${metrics.newLeads} para contatar`}
          icon={Users}
          variant="primary"
          delay={0}
        />
        <StatCard
          title="Clientes ativos"
          value={metrics.activeClients}
          subtitle="na carteira atual"
          icon={UserCheck}
          delay={0.07}
        />
        <StatCard
          title="Projetos ativos"
          value={metrics.inProgressProjects}
          subtitle="em execução"
          icon={Briefcase}
          delay={0.14}
        />
        <StatCard
          title="Receita do mês"
          value={formatCurrency(metrics.monthRevenue)}
          subtitle={`Conversão ${formatPercent(metrics.conversionRate)}`}
          icon={TrendingUp}
          delay={0.21}
        />
      </div>

      <SectionLabel label="Desempenho" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div className="flex flex-col gap-4">
          <ProjectStatus />
          <FinanceOverview />
        </div>
      </div>

      <SectionLabel label="Atualizações recentes" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentLeads />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-between pt-8 pb-2 border-t border-dark-border mt-8"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          <p className="text-xs text-white/30">Tudo certo na operação</p>
        </div>
        <p className="text-xs text-white/20 hidden md:block">
          Loa Design · Crescendo junto com você 🚀
        </p>
      </motion.div>

      <ProjectModal open={projectModal} onClose={() => setProjectModal(false)} />
    </div>
  )
}
