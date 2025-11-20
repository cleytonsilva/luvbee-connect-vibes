import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Componente de rota protegida para administradores
 * Verifica se o usuário autenticado tem role 'admin'
 * Apenas o usuário cleyton7silva@gmail.com tem acesso admin
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      // Se ainda está carregando autenticação, aguardar
      if (authLoading) {
        return;
      }

      // Se não há usuário, não é admin
      if (!user) {
        console.log('[AdminRoute] Nenhum usuário autenticado');
        setIsAdmin(false);
        setCheckingRole(false);
        return;
      }

      // Verificação rápida por email primeiro (fallback)
      if (user.email === 'cleyton7silva@gmail.com') {
        console.log('[AdminRoute] Email verificado como admin:', user.email);
        // Ainda vamos verificar no banco, mas já sabemos que é admin
      }

      try {
        // Buscar o perfil do usuário para verificar a role
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('role, email')
          .eq('id', user.id)
          .single();

        console.log('[AdminRoute] Verificando acesso admin:', {
          userId: user.id,
          userEmail: user.email,
          profileData: userProfile,
          error
        });

        if (error) {
          console.error('[AdminRoute] Erro ao verificar role do usuário:', error);
          // Se houver erro mas o email for cleyton7silva@gmail.com, permitir acesso
          if (user.email === 'cleyton7silva@gmail.com') {
            console.log('[AdminRoute] Acesso permitido por email (cleyton7silva@gmail.com)');
            setIsAdmin(true);
            setCheckingRole(false);
            return;
          }
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        // Verificar se é admin ou se o email é cleyton7silva@gmail.com
        const hasAdminRole = userProfile?.role === 'admin' || userProfile?.email === 'cleyton7silva@gmail.com' || user.email === 'cleyton7silva@gmail.com';
        
        console.log('[AdminRoute] Resultado da verificação:', {
          role: userProfile?.role,
          email: userProfile?.email,
          hasAdminRole
        });
        
        setIsAdmin(hasAdminRole);
        setCheckingRole(false);
      } catch (error) {
        console.error('[AdminRoute] Erro ao verificar permissões de admin:', error);
        // Em caso de erro, verificar se o email é cleyton7silva@gmail.com
        if (user.email === 'cleyton7silva@gmail.com') {
          console.log('[AdminRoute] Acesso permitido por email após erro');
          setIsAdmin(true);
          setCheckingRole(false);
          return;
        }
        setIsAdmin(false);
        setCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  // Mostrar loading enquanto verifica
  if (authLoading || checkingRole) {
    return <LoadingSpinner fullScreen />;
  }

  // Se não há usuário, redirecionar para auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se não é admin, mostrar mensagem de acesso negado
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta área. Apenas administradores podem acessar o painel administrativo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Renderizar conteúdo admin
  return <>{children}</>;
}

