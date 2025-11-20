import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserService } from "@/services/user.service";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userLoginSchema, userRegisterSchema, type UserLoginInput, type UserRegisterInput } from "@/lib/validations";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logEmailValidationError, getErrorCode } from "@/lib/email-validation-logger";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isLoading, error, user, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  
  // Login form
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin },
    reset: resetLogin
  } = useForm<UserLoginInput>({
    resolver: zodResolver(userLoginSchema)
  });

  // Register form
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    watch,
    setValue,
    formState: { errors: errorsSignup },
    reset: resetSignup
  } = useForm<UserRegisterInput & { confirmPassword: string; acceptTerms: boolean }>({
    resolver: zodResolver(userRegisterSchema.extend({
      confirmPassword: userRegisterSchema.shape.password
    }))
  });

  const password = watch('password');

  // Limpar erros ao trocar de aba
  const handleTabChange = (value: string) => {
    clearError();
    setActiveTab(value as "login" | "signup");
    resetLogin();
    resetSignup();
  };

  // Redirecionar quando autenticação for bem-sucedida
  useEffect(() => {
    if (user && !isLoading && !error) {
      const redirectUser = async () => {
        try {
          // Verificar se o email foi confirmado
          const isEmailConfirmed = user.email_confirmed_at || user.confirmed_at
          
          // Se o email não foi confirmado, redirecionar para página de confirmação
          if (!isEmailConfirmed) {
            toast.info("Confirme seu email", {
              description: "Verifique sua caixa de entrada para continuar",
            });
            navigate("/confirm-email", { replace: true });
            return;
          }

          const hasCompleted = await UserService.hasCompletedOnboarding(user.id);
          
          if (hasCompleted) {
            toast.success("Login realizado!", {
              description: "Bem-vindo de volta ao luvbee",
            });
            navigate("/dashboard/vibe-local", { replace: true });
          } else {
            toast.success("Conta criada!", {
              description: "Complete seu perfil para começar",
            });
            navigate("/onboarding", { replace: true });
          }
        } catch (err) {
          console.warn("Erro ao verificar onboarding:", err);
          // Se houver erro, verificar se email está confirmado antes de redirecionar
          const isEmailConfirmed = user.email_confirmed_at || user.confirmed_at
          if (!isEmailConfirmed) {
            navigate("/confirm-email", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        }
      };

      redirectUser();
    }
  }, [user, isLoading, error, navigate]);

  // Mostrar erros via toast
  useEffect(() => {
    if (error) {
      toast.error(activeTab === "login" ? "Erro ao fazer login" : "Erro ao criar conta", {
        description: error,
      });
    }
  }, [error, activeTab]);

  const handleLogin = async (data: UserLoginInput) => {
    try {
      await signIn(data.email, data.password);
      // O redirecionamento será feito pelo useEffect quando user for definido
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao fazer login";
      
      // Log email validation errors in the specific format
      if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        const errorCode = getErrorCode(errorMessage);
        logEmailValidationError({
          email: data.email,
          error: errorMessage,
          code: errorCode
        });
      }
      
      toast.error("Erro ao fazer login", {
        description: errorMessage,
      });
    }
  };

  const handleSignup = async (data: UserRegisterInput & { confirmPassword: string; acceptTerms: boolean }) => {
    if (data.password !== data.confirmPassword) {
      toast.error("Erro de validação", {
        description: "As senhas não coincidem",
      });
      return;
    }

    if (!data.acceptTerms) {
      toast.error("Erro de validação", {
        description: "Você deve aceitar os Termos de Uso para criar uma conta",
      });
      return;
    }

    try {
      // Remover campos que não são enviados ao backend
      const { confirmPassword, acceptTerms, ...signupData } = data;
      await signUp(signupData.email, signupData.password, signupData.name);
      // O redirecionamento será feito pelo useEffect quando user for definido
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar conta";
      
      // Log email validation errors in the specific format
      if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        const errorCode = getErrorCode(errorMessage);
        logEmailValidationError({
          email: data.email,
          error: errorMessage,
          code: errorCode
        });
      }
      
      toast.error("Erro ao criar conta", {
        description: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2" />
          Voltar
        </Button>

        <Card className="shadow-hard border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold font-display flex items-center justify-center gap-2">
              luvbee
              <img 
                src="/iconwhite.png" 
                alt="Luvbee Logo" 
                className="w-12 h-12 dark:hidden object-contain"
              />
              <img 
                src="/iconblack.png" 
                alt="Luvbee Logo" 
                className="w-12 h-12 hidden dark:block object-contain"
              />
            </CardTitle>
            <CardDescription>
              Sua noite perfeita começa aqui
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleSubmitLogin(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...registerLogin('email')}
                      disabled={isLoading}
                      className={errorsLogin.email ? 'border-destructive' : ''}
                    />
                    {errorsLogin.email && (
                      <p className="text-sm text-destructive">{errorsLogin.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerLogin('password')}
                      disabled={isLoading}
                    />
                    {errorsLogin.password && (
                      <p className="text-sm text-destructive">{errorsLogin.password.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSubmitSignup(handleSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      {...registerSignup('name')}
                      disabled={isLoading}
                    />
                    {errorsSignup.name && (
                      <p className="text-sm text-destructive">{errorsSignup.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...registerSignup('email')}
                      disabled={isLoading}
                      className={errorsSignup.email ? 'border-destructive' : ''}
                    />
                    {errorsSignup.email && (
                      <p className="text-sm text-destructive">{errorsSignup.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerSignup('password')}
                      disabled={isLoading}
                    />
                    {errorsSignup.password && (
                      <p className="text-sm text-destructive">{errorsSignup.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerSignup('confirmPassword', {
                        validate: (value) => value === password || 'As senhas não coincidem'
                      })}
                      disabled={isLoading}
                    />
                    {errorsSignup.confirmPassword && (
                      <p className="text-sm text-destructive">{errorsSignup.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="accept-terms"
                      checked={watch('acceptTerms')}
                      onCheckedChange={(checked) => setValue('acceptTerms', checked === true)}
                      disabled={isLoading}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="accept-terms"
                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Aceito os{" "}
                        <Link 
                          to="/termos-de-uso" 
                          target="_blank"
                          className="text-primary underline hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Termos de Uso
                        </Link>
                        {" "}e confirmo que tenho mais de 18 anos
                      </Label>
                    </div>
                  </div>
                  {errorsSignup.acceptTerms && (
                    <p className="text-sm text-destructive">{errorsSignup.acceptTerms.message}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
