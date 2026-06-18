import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Eye, EyeOff, Lock } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { useToastStore } from '@/store/toast.store'
import { authService } from '@/services/auth.service'
import { extractError } from '@/services/api'
import type { AgencySettings } from '@/types'

interface Section { id: string; label: string }

const sections: Section[] = [
  { id: 'profile', label: 'Perfil' },
  { id: 'security', label: 'Segurança' },
  { id: 'agency', label: 'Agência' },
  { id: 'notifications', label: 'Notificações' },
]

const NOTIFICATION_LABELS: Record<keyof AgencySettings['notifications'], string> = {
  newLead: 'Novo lead recebido',
  statusChange: 'Status de lead alterado',
  paymentReceived: 'Pagamento confirmado',
  projectDelivered: 'Projeto entregue',
}

// ─── Security form state inicial ────────────────────────────────────────────
const EMPTY_SECURITY = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const { settings, updateSettings, updateNotifications } = useSettingsStore()
  const toast = useToastStore()

  const [active, setActive] = useState('profile')
  const [saving, setSaving] = useState(false)

  // Profile draft
  const [profileDraft, setProfileDraft] = useState({
    name: user?.name ?? settings.ownerName,
    email: user?.email ?? settings.ownerEmail,
  })

  // Agency draft
  const [agencyDraft, setAgencyDraft] = useState({
    name: settings.name,
    email: settings.email,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    website: settings.website,
  })

  // Security draft
  const [security, setSecurity] = useState(EMPTY_SECURITY)
  const [securityErrors, setSecurityErrors] = useState<Partial<typeof EMPTY_SECURITY>>({})
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // ── Save profile / agency ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      if (active === 'profile') {
        updateUser({ name: profileDraft.name, email: profileDraft.email })
        await updateSettings({ ownerName: profileDraft.name, ownerEmail: profileDraft.email })
      } else if (active === 'agency') {
        await updateSettings(agencyDraft)
      }
      toast.success('Configurações salvas com sucesso.')
    } catch (err) {
      toast.error('Erro ao salvar', extractError(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  const validateSecurity = (): boolean => {
    const errors: Partial<typeof EMPTY_SECURITY> = {}

    if (!security.currentPassword) {
      errors.currentPassword = 'Informe sua senha atual.'
    }
    if (!security.newPassword) {
      errors.newPassword = 'Informe a nova senha.'
    } else if (security.newPassword.length < 8) {
      errors.newPassword = 'A nova senha precisa ter no mínimo 8 caracteres.'
    } else if (security.newPassword === security.currentPassword) {
      errors.newPassword = 'A nova senha precisa ser diferente da atual.'
    }
    if (!security.confirmPassword) {
      errors.confirmPassword = 'Confirme a nova senha.'
    } else if (security.confirmPassword !== security.newPassword) {
      errors.confirmPassword = 'As senhas não coincidem.'
    }

    setSecurityErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePassword = async () => {
    if (!validateSecurity()) {
      toast.error('Revise os campos', 'Há erros no formulário.')
      return
    }

    setChangingPassword(true)
    try {
      // Bearer token é injetado automaticamente pelo interceptor (services/api.ts)
      await authService.changePassword({
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      })

      // Sucesso real (backend respondeu 2xx) — só agora limpa e avisa
      setSecurity(EMPTY_SECURITY)
      setSecurityErrors({})

      toast.success(
        'Senha alterada com sucesso',
        'Você será desconectada agora. Use a nova senha no próximo login.'
      )

      // Dá tempo de ler o toast antes do redirect
      setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, 1500)
    } catch (err) {
      // Mostra o erro REAL do backend (ex: "Senha atual incorreta.")
      const message = extractError(err)
      toast.error('Não foi possível alterar a senha', message)
      // Mantém os campos preenchidos para a usuária corrigir
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" description="Gerencie sua conta e os dados da Loa Design" />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-48 shrink-0">
          <nav className="card p-2 space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active === s.id
                    ? 'bg-loa-600/15 text-loa-400 border border-loa-600/20'
                    : 'text-white/45 hover:text-white/80 hover:bg-dark-hover border border-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0">
          <div className="card p-6 space-y-6">
            {active === 'profile' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Informações do perfil</h3>
                  <p className="text-xs text-white/40 mt-0.5">Dados pessoais usados no painel.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Nome" value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} />
                  <Input label="E-mail" type="email" value={profileDraft.email} onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })} />
                </div>
              </>
            )}

            {active === 'security' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Segurança</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Altere sua senha de acesso. Você será desconectada após salvar.
                  </p>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); void handleChangePassword() }}
                  className="max-w-sm space-y-4"
                  autoComplete="off"
                >
                  <Input
                    label="Senha atual"
                    type={showCurrent ? 'text' : 'password'}
                    value={security.currentPassword}
                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                    error={securityErrors.currentPassword}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowCurrent((s) => !s)}
                        className="pointer-events-auto text-white/30 hover:text-white/60"
                        aria-label={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                  <Input
                    label="Nova senha"
                    type={showNew ? 'text' : 'password'}
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                    error={securityErrors.newPassword}
                    hint="Mínimo de 8 caracteres."
                    placeholder="••••••••"
                    autoComplete="new-password"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowNew((s) => !s)}
                        className="pointer-events-auto text-white/30 hover:text-white/60"
                        aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                  <Input
                    label="Confirmar nova senha"
                    type={showNew ? 'text' : 'password'}
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                    error={securityErrors.confirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={changingPassword}
                      leftIcon={<Lock size={14} />}
                    >
                      {changingPassword ? 'Alterando...' : 'Alterar senha'}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {active === 'agency' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Dados da agência</h3>
                  <p className="text-xs text-white/40 mt-0.5">Informações exibidas no site público e usadas em contatos.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Nome da agência" value={agencyDraft.name} onChange={(e) => setAgencyDraft({ ...agencyDraft, name: e.target.value })} />
                  <Input label="E-mail de contato" value={agencyDraft.email} onChange={(e) => setAgencyDraft({ ...agencyDraft, email: e.target.value })} />
                  <Input label="WhatsApp (com DDI)" value={agencyDraft.whatsapp} onChange={(e) => setAgencyDraft({ ...agencyDraft, whatsapp: e.target.value })} placeholder="5554999912694" />
                  <Input label="Instagram" value={agencyDraft.instagram} onChange={(e) => setAgencyDraft({ ...agencyDraft, instagram: e.target.value })} placeholder="@loadesigndigital" />
                  <Input label="Site" className="sm:col-span-2" value={agencyDraft.website} onChange={(e) => setAgencyDraft({ ...agencyDraft, website: e.target.value })} />
                </div>
              </>
            )}

            {active === 'notifications' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">Notificações</h3>
                  <p className="text-xs text-white/40 mt-0.5">Escolha o que você quer receber.</p>
                </div>
                <div className="space-y-2">
                  {(Object.keys(NOTIFICATION_LABELS) as Array<keyof AgencySettings['notifications']>).map((key) => {
                    const enabled = settings.notifications[key]
                    return (
                      <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-dark-input border border-dark-border cursor-pointer hover:border-dark-muted transition-colors">
                        <span className="text-sm text-white/65">{NOTIFICATION_LABELS[key]}</span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => updateNotifications({ [key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-dark-muted rounded-full peer-checked:bg-loa-600 transition-colors" />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                        </div>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            {/* Botão "Salvar alterações" só nas abas profile/agency.
                Security tem botão próprio dentro do form. */}
            {(active === 'profile' || active === 'agency') && (
              <div className="pt-2 border-t border-dark-border">
                <Button variant="primary" size="md" loading={saving} onClick={handleSave} leftIcon={<Save size={14} />}>
                  Salvar alterações
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
