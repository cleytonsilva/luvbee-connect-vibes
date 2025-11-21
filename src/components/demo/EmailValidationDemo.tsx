import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormEmailInput } from '@/components/ui/form-email-input'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * Componente de demonstração para testar validação de email
 * 
 * Features:
 * - Teste de diferentes formatos de email
 * - Visualização de mensagens de erro
 * - Demonstração de impedimento de envio
 * - Log de erros para debugging
 */
export function EmailValidationDemo() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      email: '',
      testEmail: ''
    }
  })

  const currentEmail = watch('email')
  const testEmail = watch('testEmail')

  const onSubmit = (data: any) => {
    toast.success('Email válido!', {
      description: `Email aceito: ${data.email}`
    })
  }

  const testEmails = [
    { email: 'usuario@example.com', valid: true, description: 'Email básico válido' },
    { email: 'nome.sobrenome@empresa.com.br', valid: true, description: 'Email brasileiro válido' },
    { email: 'teste+tag@gmail.com', valid: true, description: 'Email com tag válido' },
    { email: 'invalid-email', valid: false, description: 'Sem @ - deve falhar' },
    { email: 'user@', valid: false, description: 'Sem domínio - deve falhar' },
    { email: '@domain.com', valid: false, description: 'Sem parte local - deve falhar' },
    { email: 'user@domain', valid: false, description: 'Sem extensão - deve falhar' },
    { email: 'user@@domain.com', valid: false, description: 'Múltiplos @ - deve falhar' },
    { email: 'user@.com', valid: false, description: 'Domínio começa com ponto - deve falhar' },
    { email: 'user@domain.', valid: false, description: 'Domínio termina com ponto - deve falhar' }
  ]

  const testEmailFormat = async (email: string) => {
    setValue('testEmail', email)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Validação de Email - Demonstração</CardTitle>
          <CardDescription>
            Teste a validação de email com diferentes formatos e veja as mensagens de erro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulário de teste principal */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormEmailInput
              name="email"
              label="Email para teste"
              placeholder="Digite um email para testar"
              validationOptions={{
                required: true,
                customMessage: 'Por favor, insira um email válido'
              }}
              showValidationIcons={true}
              debounceMs={500}
            />
            
            <Button 
              type="submit" 
              disabled={!!errors.email}
              className="w-full"
            >
              {errors.email ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Corrija o email para continuar
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Email válido - Enviar
                </>
              )}
            </Button>
          </form>

          {/* Status atual */}
          {currentEmail && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Status Atual:</h4>
              <p className="text-sm text-muted-foreground">
                Email digitado: <span className="font-mono">{currentEmail}</span>
              </p>
              {errors.email ? (
                <p className="text-sm text-destructive mt-1">
                  Erro: {errors.email.message}
                </p>
              ) : (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Email válido!
                </p>
              )}
            </div>
          )}

          {/* Testes rápidos */}
          <div className="space-y-4">
            <h4 className="font-medium">Testes Rápidos:</h4>
            <p className="text-sm text-muted-foreground">
              Clique nos botões abaixo para testar diferentes formatos de email:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {testEmails.map((test, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => testEmailFormat(test.email)}
                  className="justify-start text-left"
                >
                  <div className="flex items-center gap-2">
                    {test.valid ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                    <div>
                      <div className="font-mono text-xs">{test.email}</div>
                      <div className="text-xs text-muted-foreground">{test.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Campo de teste separado */}
          <div className="space-y-4">
            <h4 className="font-medium">Campo de Teste:</h4>
            <FormEmailInput
              name="testEmail"
              label="Teste emails aqui"
              placeholder="Use os botões acima ou digite manualmente"
              validationOptions={{
                required: false,
                customMessage: 'Email inválido - verifique o formato'
              }}
              showValidationIcons={true}
              debounceMs={300}
            />
            
            {testEmail && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-mono">{testEmail}</span>
                  {errors.testEmail ? (
                    <span className="text-destructive ml-2">
                      - {errors.testEmail.message}
                    </span>
                  ) : (
                    <span className="text-green-600 ml-2">
                      - ✓ Válido
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Regras de validação */}
          <div className="space-y-2">
            <h4 className="font-medium">Regras de Validação:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Deve conter @ obrigatório</li>
              <li>✓ Deve ter domínio válido (ex: .com, .com.br)</li>
              <li>✓ Caracteres permitidos antes e depois do @</li>
              <li>✓ Comprimento mínimo e máximo adequados</li>
              <li>✓ Domínio não pode começar/terminar com ponto</li>
              <li>✓ Apenas um @ permitido</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}