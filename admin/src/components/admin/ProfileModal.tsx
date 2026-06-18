import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Mail, Shield } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/auth.store'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const name  = user?.name  ?? 'Loa'
  const email = user?.email ?? 'admin@loadesign.com'
  const role  = user?.role  ?? 'ADMIN'

  const goSettings = () => {
    onClose()
    navigate('/settings')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Meu perfil"
      description="Dados da sua conta no painel."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Fechar</Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<SettingsIcon size={13} />}
            onClick={goSettings}
          >
            Editar nas configurações
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 pb-5 border-b border-dark-border">
        <Avatar name={name} size="lg" />
        <div className="text-center">
          <p className="text-base font-semibold text-white">{name}</p>
          <p className="text-xs text-white/40 mt-0.5">{email}</p>
        </div>
      </div>

      <div className="pt-5 space-y-3">
        <InfoRow icon={Mail}  label="E-mail"  value={email} />
        <InfoRow icon={Shield} label="Função" value={String(role).toUpperCase()} />
      </div>
    </Modal>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-input border border-dark-border">
      <div className="w-8 h-8 rounded-lg bg-dark-muted flex items-center justify-center shrink-0">
        <Icon size={13} className="text-white/40" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xs uppercase tracking-wider text-white/30 font-medium">{label}</p>
        <p className="text-sm text-white/80 truncate">{value}</p>
      </div>
    </div>
  )
}
