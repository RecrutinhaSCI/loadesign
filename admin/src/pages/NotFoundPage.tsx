import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Home } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-8xl font-bold text-white/5 mb-4 font-mono">404</p>
        <h1 className="text-lg font-semibold text-white/60 mb-2">Página não encontrada</h1>
        <p className="text-sm text-white/25 mb-6">A rota que você tentou acessar não existe.</p>
        <Button variant="primary" leftIcon={<Home size={14} />} onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </motion.div>
    </div>
  )
}
