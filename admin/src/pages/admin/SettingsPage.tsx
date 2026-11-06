import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Eye, EyeOff, Lock, Undo2, KeyRound } from 'lucide-react'
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
  const { settings, loaded: settingsLoaded, updateSettings } = useSettingsStore()
  const toast = useToastStore()

  const [active, setActive] = useState('profile')
  const [saving, setSaving] = useState(false)

  // ── Rascunhos (nada é gravado até "Salvar alterações") ─────────────────────
  // Perfil: nome de exibição + e-mail COMERCIAL da responsável (ownerEmail).
  // O e-mail de LOGIN (user.email) é só leitura aqui: muda-se com o responsável
  // técnico, para não perder o acesso ao painel por engano.
  const fromSettings = () => ({
    profile: { name: settings.ownerName || user?.name || '', commercialEmail: settings.ownerEmail },
    agency: { name: settings.name, email: settings.email, whatsapp: settings.whatsapp, instagram: settings.instagram, website: settings.website },
    notifications: { ...settings.notifications },
  })
  const [profileDraft, setProfileDraft] = useState(() => fromSettings().profile)
  const [agencyDraft, setAgencyDraft] = useState(() => fromSettings().agency)
  const [notifDraft, setNotifDraft] = useState(() => fromSettings().notifications)

  const base = fromSettings()
  const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b)
  const dirty = {
    profile: !same(profileDraft, base.profile),
    agency: !same(agencyDraft, base.agency),
    notifications: !same(notifDraft, base.notifications),
  }
  type Editable = keyof typeof dirty
  const isEditable = (id: string): id is Editable => id in dirty
  const anyDirty = dirty.profile || dirty.agency || dirty.notifications

  // As configurações chegam do servidor depois da primeira renderização:
  // atualiza os rascunhos que ainda não foram editados.
  useEffect(() => {
    if (!settingsLoaded) return
    const next = fromSettings()
    if (!dirty.profile) setProfileDraft(next.profile)
    if (!dirty.agency) setAgencyDraft(next.agency)
    if (!dirty.notifications) setNotifDraft(next.notifications)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, settings])

  // Aviso ao fechar/recarregar a página com alterações pendentes.
  useEffect(() => {
    if (!anyDirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [anyDirty])

  const [saveError, setSaveError] = useState<string | null>(null)

  const discard = (section: Editable) => {
    const b = fromSettings()
    if (section === 'profile') setProfileDraft(b.profile)
    if (section === 'agency') setAgencyDraft(b.agency)
    if (section === 'notifications') setNotifDraft(b.notifications)
    setSaveError(null)
  }

  const switchSection = (id: string) => {
    if (id === active) return
    if (isEditable(active) && dirty[active]) {
      if (!window.confirm('Há alterações não salvas nesta aba. Descartar e trocar de aba?')) return
      discard(active)
    }
    setSaveError(null)
    setActive(id)
  }

  // Security draft
  const [security, setSecurity] = useState(EMPTY_SECURITY)
  const [securityErrors, setSecurityErrors] = useState<Partial<typeof EMPTY_SECURITY>>({})
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // ── Save profile / agency ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null)
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (active === 'profile') {
      if (!profileDraft.name.trim()) { setSaveError('Informe o nome.'); return }
      if (profileDraft.commercialEmail.trim() && !EMAIL_RE.test(profileDraft.commercialEmail.trim())) { setSaveError('E-mail comercial inválido.'); return }
    }
    if (active === 'agency' && agencyDraft.email.trim() && !EMAIL_RE.test(agencyDraft.email.trim())) {
      setSaveError('E-mail de contato inválido.'); return
    }
    setSaving(true)
    try {
      if (active === 'profile') {
        await updateSettings({ ownerName: profileDraft.name.trim(), ownerEmail: profileDraft.commercialEmail.trim() })
        updateUser({ name: profileDraft.name.trim() }) // só o nome exibido; o e-mail de login não muda
      } else if (active === 'agency') {
        await updateSettings({ ...agencyDraft, email: agencyDraft.email.trim() })
      } else if (active === 'notifications') {
        await updateSettings({ notifications: notifDraft })
      }
      toast.success('Configurações salvas com sucesso.')
    } catch (err) {
      const message = extractError(err)
      setSaveError(message)
      toast.error('Erro ao salvar', message)
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
                onClick={() => switchSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active === s.id
                    ? 'bg-loa-600/15 text-loa-400 border border-loa-600/20'
                    : 'text-white/45 hover:text-white/80 hover:bg-dark-hover border border-transparent'
                }`}
              >
                {s.label}
                {isEditable(s.id) && dirty[s.id] && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" title="Alterações não salvas" />
                )}
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
                  <p className="text-xs text-white/40 mt-0.5">Nome exibido no painel e e-mail comercial da responsável.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Nome" value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} />
                  <Input label="E-mail comercial" type="email" value={profileDraft.commercialEmail}
                    hint="Para contato comercial. Não altera o e-mail de acesso."
                    onChange={(e) => setProfileDraft({ ...profileDraft, commercialEmail: e.target.value })} />
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-input border border-dark-border">
                  <KeyRound size={15} className="text-white/35 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-2xs uppercase tracking-wider text-white/35">E-mail de acesso ao painel (login)</p>
                    <p className="text-sm text-white/75 break-all" data-testid="login-email">{user?.email || '—'}</p>
                    <p className="text-xs text-white/35 mt-0.5">Usado só para entrar no painel. Para alterá-lo, fale com o responsável técnico. A senha muda em Segurança.</p>
                  </div>
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
                  <p className="text-xs text-white/40 mt-0.5">Escolha o que você quer receber. As mudanças só valem depois de salvar.</p>
                </div>
                <div className="space-y-2">
                  {(Object.keys(NOTIFICATION_LABELS) as Array<keyof AgencySettings['notifications']>).map((key) => {
                    const enabled = notifDraft[key]
                    return (
                      <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-dark-input border border-dark-border cursor-pointer hover:border-dark-muted transition-colors">
                        <span className="text-sm text-white/65">{NOTIFICATION_LABELS[key]}</span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setNotifDraft({ ...notifDraft, [key]: e.target.checked })}
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

            {/* "Salvar alterações" em Perfil, Agência e Notificações (Segurança tem
                botão próprio). Nada é gravado antes do clique. */}
            {isEditable(active) && (
              <div className="pt-2 border-t border-dark-border space-y-3">
                {saveError && <p role="alert" className="text-xs text-red-400">{saveError}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="md" loading={saving} disabled={!dirty[active]} onClick={handleSave} leftIcon={<Save size={14} />}>
                    Salvar alterações
                  </Button>
                  {dirty[active] && (
                    <>
                      <Button variant="ghost" size="md" disabled={saving} onClick={() => discard(active)} leftIcon={<Undo2 size={14} />}>
                        Descartar
                      </Button>
                      <span className="text-xs text-amber-300/80">Alterações não salvas</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
