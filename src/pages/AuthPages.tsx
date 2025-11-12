import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoginPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login')

  return (
    <AuthLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">Entrar</TabsTrigger>
          <TabsTrigger value="register">Criar Conta</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <LoginForm 
            onSuccess={() => navigate('/')}
            onSwitchToRegister={() => setActiveTab('register')}
          />
        </TabsContent>
        <TabsContent value="register">
          <RegisterForm 
            onSuccess={() => navigate('/onboarding')}
            onSwitchToLogin={() => setActiveTab('login')}
          />
        </TabsContent>
      </Tabs>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()

  return (
    <AuthLayout>
      <RegisterForm 
        onSuccess={() => navigate('/onboarding')}
        onSwitchToLogin={() => navigate('/auth/login')}
      />
    </AuthLayout>
  )
}