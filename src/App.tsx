import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { AuthLayout } from './layouts/AuthLayout'
import Auth from './pages/Auth'
import { ConfirmEmail } from './pages/ConfirmEmail'
import Welcome from './pages/HomePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PeoplePage } from './pages/PeoplePage'
import { MessagesPage } from './pages/MessagesPage'
import { ProfilePage } from './pages/ProfilePage'
import { LocationsPage } from './pages/LocationsPage'
import { VibeLocalPage } from './pages/VibeLocalPage'
import { LocationDetail } from './pages/LocationDetailPage'
import { ExplorePage } from './pages/ExplorePage'
import { LocationDetail as ExploreLocationDetail } from './components/discovery/LocationDetail'
import { TermosDeUso } from './pages/TermosDeUso'
import AdminCachePage from './pages/AdminCache'
import { useAuth } from './hooks/useAuth'
import { UserService } from './services/user.service'
import { useEffect, useState, useRef } from 'react'
import { LoadingSpinner } from './components/ui/loading-spinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const hasCheckedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const onboardingResultRef = useRef<boolean | null>(null)

  useEffect(() => {
    // Se ainda está carregando autenticação inicial, aguardar
    if (loading) {
      return
    }

    // Se não há usuário, finalizar verificação
    if (!user) {
      if (hasCheckedRef.current) {
        return
      }
      hasCheckedRef.current = true
      setCheckingOnboarding(false)
      setOnboardingCompleted(false)
      onboardingResultRef.current = false
      return
    }

    // Se o usuário mudou, resetar o estado de verificação
    if (lastUserIdRef.current !== user.id) {
      hasCheckedRef.current = false
      lastUserIdRef.current = user.id
      onboardingResultRef.current = null
      setCheckingOnboarding(true)
      setOnboardingCompleted(false)
    }

    // Se já temos resultado em cache para este usuário, usar diretamente
    if (onboardingResultRef.current !== null && lastUserIdRef.current === user.id) {
      setOnboardingCompleted(onboardingResultRef.current)
      setCheckingOnboarding(false)
      return
    }

    // Se já verificou para este usuário, não verificar novamente
    if (hasCheckedRef.current && lastUserIdRef.current === user.id) {
      return
    }

    hasCheckedRef.current = true
    
    const checkOnboarding = async () => {
      try {
        const completed = await UserService.hasCompletedOnboarding(user.id)
        
        // Sempre atualizar o ref, mesmo se componente desmontar
        onboardingResultRef.current = completed
        
        // Atualizar estado apenas se ainda estamos no mesmo usuário
        if (lastUserIdRef.current === user.id) {
          setOnboardingCompleted(completed)
          setCheckingOnboarding(false)
        }
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error)
        onboardingResultRef.current = false
        if (lastUserIdRef.current === user.id) {
          setOnboardingCompleted(false)
          setCheckingOnboarding(false)
        }
      }
    }

    checkOnboarding()
  }, [user, loading])

  // Mostrar loading enquanto verifica
  if (loading || checkingOnboarding) {
    return <LoadingSpinner fullScreen />
  }

  // Se não há usuário, redirecionar para auth
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Se não completou onboarding, redirecionar
  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  // Renderizar conteúdo protegido
  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    // Evitar múltiplas verificações
    if (hasCheckedRef.current) return
    
    let isMounted = true
    
    const checkOnboarding = async () => {
      // Se há usuário, verificar confirmação de email primeiro
      if (user) {
        // Verificar se o email foi confirmado
        const isEmailConfirmed = user.email_confirmed_at || user.confirmed_at
        
        if (!isEmailConfirmed) {
          console.info('[OnboardingRoute] Email não confirmado, redirecionando para /confirm-email')
          if (isMounted) {
            setCheckingOnboarding(false)
            hasCheckedRef.current = true
            navigate('/confirm-email', { replace: true })
          }
          return
        }

        try {
          const completed = await UserService.hasCompletedOnboarding(user.id)
          if (isMounted) {
            setOnboardingCompleted(completed)
            setCheckingOnboarding(false)
            hasCheckedRef.current = true
          }
          console.info('[OnboardingRoute] onboarding status', { completed })
        } catch (error) {
          console.error('Erro ao verificar onboarding:', error)
          if (isMounted) {
            setOnboardingCompleted(false)
            setCheckingOnboarding(false)
            hasCheckedRef.current = true
          }
        }
        return
      }

      // Se não há usuário e não está carregando, não precisa verificar
      if (!user && !loading) {
        if (isMounted) {
          setCheckingOnboarding(false)
          hasCheckedRef.current = true
        }
        console.info('[OnboardingRoute] no user, finished checking')
        return
      }
    }

    checkOnboarding()
    
    return () => {
      isMounted = false
    }
  }, [user, loading, navigate])

  // Mostrar loading apenas quando ainda checando ou quando autenticação inicial sem usuário
  if (checkingOnboarding || (!user && loading)) {
    return <LoadingSpinner fullScreen />
  }

  // Se não há usuário, redirecionar para auth
  if (!user) {
    console.info('[OnboardingRoute] redirect -> /auth')
    return <Navigate to="/auth" replace />
  }

  // Se já completou onboarding, redirecionar para dashboard (só uma vez)
  if (onboardingCompleted) {
    console.info('[OnboardingRoute] redirect -> /dashboard/vibe-local')
    return <Navigate to="/dashboard/vibe-local" replace />
  }

  // Renderizar o conteúdo do onboarding
  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user && !loading) {
        // Verificar se o email foi confirmado primeiro
        const isEmailConfirmed = user.email_confirmed_at || user.confirmed_at
        
        if (!isEmailConfirmed) {
          console.info('[AuthRoute] Email não confirmado, redirecionando para /confirm-email')
          setCheckingOnboarding(false)
          navigate('/confirm-email', { replace: true })
          return
        }

        const completed = await UserService.hasCompletedOnboarding(user.id)
        setOnboardingCompleted(completed)
        setCheckingOnboarding(false)
        console.info('[AuthRoute] onboarding status', { completed })
      } else if (!loading && !user) {
        setCheckingOnboarding(false)
        console.info('[AuthRoute] no user, finished checking')
      }
    }

    checkOnboarding()
  }, [user, loading, navigate])

  if (loading || checkingOnboarding) {
    return <LoadingSpinner fullScreen />
  }

  if (user) {
    // Verificar confirmação de email novamente antes de redirecionar
    const isEmailConfirmed = user.email_confirmed_at || user.confirmed_at
    if (!isEmailConfirmed) {
      return <Navigate to="/confirm-email" replace />
    }

    // Se já completou onboarding, redirecionar para dashboard
    if (onboardingCompleted) {
      console.info('[AuthRoute] redirect -> /dashboard/vibe-local')
      return <Navigate to="/dashboard/vibe-local" replace />
    }
    // Se não completou, redirecionar para onboarding
    console.info('[AuthRoute] redirect -> /onboarding')
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Rota pública - Welcome */}
      <Route path="/" element={<Welcome />} />
      
      {/* Rotas de autenticação */}
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      
      {/* Rota de confirmação de email */}
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      
      {/* Rota pública - Termos de Uso */}
      <Route path="/termos-de-uso" element={<TermosDeUso />} />
      
      {/* Rota de onboarding */}
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
      
      {/* Rotas protegidas */}
      <Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard/vibe-local" replace />} />
        <Route path="vibe-local" element={<VibeLocalPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="locations/:id" element={<LocationDetail />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="explore/location/:id" element={<ExploreLocationDetail />} />
        <Route path="admin/cache" element={<AdminCachePage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
