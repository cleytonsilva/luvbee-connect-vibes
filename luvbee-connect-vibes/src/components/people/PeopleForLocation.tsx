import { useState, useEffect } from 'react'
import { PersonCard } from '@/components/matching/PersonCard'
import { MatchService, type PotentialMatch } from '@/services/match.service'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users } from 'lucide-react'

interface PeopleForLocationProps {
  locationId: string
}

export function PeopleForLocation({ locationId }: PeopleForLocationProps) {
  const { user } = useAuth()
  const [people, setPeople] = useState<PotentialMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    loadPeople()
  }, [user, locationId])

  const loadPeople = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Buscar usuários que deram match com este local
      const { data: locationMatches, error: matchesError } = await supabase
        .from('location_matches')
        .select('user_id')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .neq('user_id', user.id) // Excluir o próprio usuário

      if (matchesError) {
        setError(matchesError.message)
        return
      }

      if (!locationMatches || locationMatches.length === 0) {
        setPeople([])
        setIsLoading(false)
        return
      }

      // Buscar matches potenciais (já filtrados por preferências de descoberta)
      const result = await MatchService.getPotentialMatches(user.id, 100)
      
      if (result.error) {
        setError(result.error)
        return
      }

      // Filtrar apenas pessoas que também deram match com este local
      const matchedUserIds = new Set(locationMatches.map((m) => m.user_id))
      const filteredPeople = (result.data || []).filter((person) =>
        matchedUserIds.has(person.id)
      )

      setPeople(filteredPeople)
    } catch (err) {
      setError('Erro ao carregar pessoas')
      console.error('Error loading people for location:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[600px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const handleLike = async (userId: string) => {
    if (!user) return
    try {
      await MatchService.createPeopleMatch(user.id, userId)
    } catch (err) {
      console.error('Error creating match:', err)
    }
  }

  const handleDislike = async (userId: string) => {
    // Implementar se necessário
  }

  if (people.length === 0) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Nenhuma pessoa encontrada</p>
          <p className="text-sm text-muted-foreground">
            Ainda não há outras pessoas que deram match com este local. Continue explorando!
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {people.length} {people.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'} que também curtiu este local
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((person) => (
          <PersonCard
            key={person.id}
            user={person}
            onLike={() => handleLike(person.id)}
            onDislike={() => handleDislike(person.id)}
          />
        ))}
      </div>
    </div>
  )
}

