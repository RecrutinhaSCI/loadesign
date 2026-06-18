import { useState } from 'react'
import {
  Phone,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  MessageSquareText,
  Briefcase,
} from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { LeadStatusBadge, statusConfig } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

import {
  formatDateTime,
  formatRelative,
  buildWhatsappLink,
} from '@/lib/utils'

import type { Lead, LeadStatus } from '@/types'
import type { LucideIcon } from 'lucide-react'

interface LeadModalProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isUpdating: boolean
}

interface InfoRowProps {
  icon: LucideIcon
  label: string
  value: string
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-dark-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-white/30" />
      </div>

      <div className="min-w-0">
        <p className="text-2xs text-white/30 uppercase tracking-wide font-medium mb-0.5">
          {label}
        </p>

        <p className="text-sm text-white/80 break-all">
          {value}
        </p>
      </div>
    </div>
  )
}

export function LeadModal({
  lead,
  open,
  onClose,
  onStatusChange,
  onDelete,
  isUpdating,
}: LeadModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!lead) return null

  const waLink = lead.phone
    ? buildWhatsappLink(
      lead.phone,
      `Olá ${lead.name}! Aqui é da Loa Design.`
    )
  : '#'

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    await onDelete(lead.id)
    setConfirmDelete(false)
    onClose()
  }

  const handleClose = () => {
    setConfirmDelete(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="Detalhes do lead"
      description={`ID: ${lead.id}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="danger"
            size="sm"
            loading={isUpdating}
            onClick={handleDelete}
            leftIcon={<Trash2 size={13} />}
          >
            {confirmDelete
              ? 'Confirmar exclusão'
              : 'Excluir lead'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
            >
              Fechar
            </Button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Phone size={13} />}
              >
                Abrir WhatsApp
              </Button>
            </a>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-5 border-b border-dark-border">
          <Avatar name={lead.name} size="lg" />

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">
              {lead.name}
            </h3>

            {lead.email && (
              <p className="text-sm text-white/40 truncate">
                {lead.email}
              </p>
            )}
          </div>

          <LeadStatusBadge status={lead.status} />
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wide font-medium mb-2">
            Atualizar status
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(statusConfig) as LeadStatus[]).map((s) => {
              const { label } = statusConfig[s]
              const isActive = lead.status === s

              return (
                <button
                  key={s}
                  disabled={isActive || isUpdating}
                  onClick={() => onStatusChange(lead.id, s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 text-left flex items-center gap-2 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-loa-600/15 border-loa-600/30 text-loa-400'
                      : 'bg-dark-input border-dark-border text-white/40 hover:border-dark-muted hover:text-white/70'
                  }`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-loa-500" />
                  )}

                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <InfoRow
            icon={Phone}
            label="Telefone"
            value={lead.phone ?? 'Não informado'}
          />

          {lead.email && (
            <InfoRow
              icon={ExternalLink}
              label="E-mail"
              value={lead.email}
            />
          )}

          {lead.service && (
            <InfoRow
              icon={Briefcase}
              label="Serviço de interesse"
              value={lead.service}
            />
          )}
        </div>

        {/* Mensagem do formulário / observações */}
        {lead.notes && (
          <div className="pt-2 border-t border-dark-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-loa-600/10 border border-loa-600/20 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquareText size={14} className="text-loa-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xs text-white/30 uppercase tracking-wide font-medium mb-1.5">
                  Mensagem do contato
                </p>
                <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap break-words">
                  {lead.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dark-border">
          <div className="flex items-center gap-2">
            <Calendar
              size={13}
              className="text-white/20"
            />

            <div>
              <p className="text-2xs text-white/25">
                Criado em
              </p>

              <p className="text-xs text-white/50">
                {formatDateTime(lead.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock
              size={13}
              className="text-white/20"
            />

            <div>
              <p className="text-2xs text-white/25">
                Última atualização
              </p>

              <p className="text-xs text-white/50">
                {formatRelative(
                  lead.updatedAt ?? lead.createdAt
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}