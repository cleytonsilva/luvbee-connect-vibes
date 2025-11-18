/**
 * PeoplePage - Vibe People
 * User Story 3: Core Loop 2 - Match com Pessoas
 * 
 * Página para descobrir e dar match com pessoas que compartilham locais em comum
 */

import { PersonSwipe } from '@/components/matching/PersonSwipe'
import { useHasLocationMatches } from '@/hooks/useMatches'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function PeoplePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: hasLocationMatches, isLoading: isLoadingCheck } = useHasLocationMatches()

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center p-8">
        <Card className="p-8">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Você precisa estar logado
          </h3>
          <p className="text-muted-foreground mb-6">
            Faça login para ver pessoas e fazer conexões
          </p>
          <Button onClick={() => navigate('/auth')}>
            Fazer Login
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoadingCheck) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Vibe People
        </h1>
        <p className="text-muted-foreground">
          Conecte-se com pessoas que compartilham seus locais favoritos
        </p>
      </div>

      {/* Verificação de pré-requisito */}
      {!hasLocationMatches ? (
        <Card className="p-8 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Você precisa dar match com locais primeiro!
          </h3>
          <p className="text-muted-foreground mb-6">
            Para ver pessoas, você precisa dar like em pelo menos um local primeiro.
            Isso garante que você só veja pessoas que compartilham seus interesses em locais.
          </p>
          <Button onClick={() => navigate('/vibe-local')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir para Vibe Local
          </Button>
        </Card>
      ) : (
        <PersonSwipe limit={10} />
      )}
    </div>
  )
}
