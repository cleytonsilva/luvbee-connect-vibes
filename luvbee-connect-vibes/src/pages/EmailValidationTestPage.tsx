import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormEmailInput } from '@/components/ui/form-email-input'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Mail, Smartphone, Tablet, Monitor } from 'lucide-react'

/**
 * Página de Teste de Validação de Email
 * 
 * Demonstra a validação de email em diferentes contextos e dispositivos
 */
export function EmailValidationTestPage() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm({
    defaultValues: {
      email1: '',
      email2: '',
      email3: ''
    }
  })

  const email1 = watch('email1')
  const email2 = watch('email2')
  const email3 = watch('email3')

  const onSubmit = (data: any) => {
    toast.success('Formulário enviado com sucesso!', {
      description: `Emails válidos: ${Object.values(data).join(', ')}`
    })
  }

  const testInvalidEmail = () => {
    setValue('email1', 'invalid-email-format')
  }

  const testValidEmail = () => {
    setValue('email1', 'usuario@example.com.br')
  }

  const testEmails = [
    { email: 'test@example.com', valid: true, description: 'Email básico' },
    { email: 'nome.sobrenome@empresa.com.br', valid: true, description: 'Email brasileiro com ponto' },
    { email: 'user+tag@domain.co.uk', valid: true, description: 'Email com tag e subdomínio' },
    { email: 'invalid-email', valid: false, description: 'Sem @ - inválido' },
    { email: 'user@', valid: false, description: 'Sem domínio - inválido' },
    { email: '@domain.com', valid: false, description: 'Sem usuário - inválido' },
    { email: 'user@domain', valid: false, description: 'Sem extensão - inválido' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Teste de Validação de Email
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Teste a validação de email em diferentes contextos, dispositivos e formatos. 
            Veja como o sistema valida e exibe mensagens de erro responsivas.
          </p>
        </div>

        {/* Dispositivos Demo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mobile */}
          <Card className="border-blue-200 bg-white/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Mobile</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Visualização em smartphones (320px+)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50 max-w-xs mx-auto">
                <FormEmailInput
                  name="email1"
                  label="Email"
                  placeholder="seu@email.com"
                  validationOptions={{
                    required: true,
                    customMessage: 'Email inválido - verifique o formato'
                  }}
                  showValidationIcons={true}
                  debounceMs={300}
                  className="text-sm"
                />
              </div>
              <div className="text-xs text-gray-500 text-center">
                {email1 ? (
                  errors.email1 ? (
                    <span className="text-red-600">✗ {errors.email1.message}</span>
                  ) : (
                    <span className="text-green-600">✓ Válido</span>
                  )
                ) : (
                  'Digite um email para testar'
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tablet */}
          <Card className="border-green-200 bg-white/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Tablet className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Tablet</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Visualização em tablets (768px+)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <FormEmailInput
                  name="email2"
                  label="Email Corporativo"
                  placeholder="nome.sobrenome@empresa.com.br"
                  validationOptions={{
                    required: true,
                    customMessage: 'Por favor, insira um email corporativo válido'
                  }}
                  showValidationIcons={true}
                  debounceMs={500}
                />
              </div>
              <div className="text-sm text-gray-500 text-center">
                {email2 ? (
                  errors.email2 ? (
                    <span className="text-red-600">✗ {errors.email2.message}</span>
                  ) : (
                    <span className="text-green-600">✓ Email corporativo válido</span>
                  )
                ) : (
                  'Digite seu email corporativo'
                )}
              </div>
            </CardContent>
          </Card>

          {/* Desktop */}
          <Card className="border-purple-200 bg-white/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Desktop</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Visualização em desktops (1024px+)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
                <FormEmailInput
                  name="email3"
                  label="Email Pessoal"
                  placeholder="seu.nome@provedor.com.br"
                  validationOptions={{
                    required: true,
                    customMessage: 'Insira um email pessoal válido para continuar'
                  }}
                  showValidationIcons={true}
                  debounceMs={400}
                />
              </div>
              <div className="text-sm text-gray-500 text-center">
                {email3 ? (
                  errors.email3 ? (
                    <span className="text-red-600">✗ {errors.email3.message}</span>
                  ) : (
                    <span className="text-green-600">✓ Email pessoal válido</span>
                  )
                ) : (
                  'Digite seu email pessoal'
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário Completo */}
        <Card className="border-gray-200 bg-white/90">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              <CardTitle>Formulário de Teste Completo</CardTitle>
            </div>
            <CardDescription>
              Teste o envio do formulário com validação de email em múltiplos campos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormEmailInput
                  name="email1"
                  label="Email Principal"
                  placeholder="principal@email.com"
                  validationOptions={{
                    required: true,
                    customMessage: 'Email principal é obrigatório'
                  }}
                  showValidationIcons={true}
                  debounceMs={300}
                />

                <FormEmailInput
                  name="email2"
                  label="Email Secundário"
                  placeholder="secundario@email.com"
                  validationOptions={{
                    required: false,
                    customMessage: 'Email secundário inválido'
                  }}
                  showValidationIcons={true}
                  debounceMs={400}
                />

                <FormEmailInput
                  name="email3"
                  label="Email Corporativo"
                  placeholder="corporativo@empresa.com.br"
                  validationOptions={{
                    required: true,
                    customMessage: 'Email corporativo é obrigatório'
                  }}
                  showValidationIcons={true}
                  debounceMs={500}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  type="submit" 
                  disabled={Object.keys(errors).length > 0}
                  className="w-full sm:w-auto"
                >
                  {Object.keys(errors).length > 0 ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Corrija os erros para enviar
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Enviar Formulário
                    </>
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={reset}
                  className="w-full sm:w-auto"
                >
                  Limpar Formulário
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Testes Rápidos */}
        <Card className="border-gray-200 bg-white/90">
          <CardHeader>
            <CardTitle>Testes Rápidos</CardTitle>
            <CardDescription>
              Clique nos botões abaixo para testar diferentes formatos de email automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {testEmails.map((test, index) => (
                <Button
                  key={index}
                  variant={test.valid ? "outline" : "destructive"}
                  size="sm"
                  onClick={() => setValue('email1', test.email)}
                  className="justify-start text-left h-auto py-3"
                >
                  <div className="flex items-start gap-2">
                    {test.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-mono text-xs truncate">{test.email}</div>
                      <div className="text-xs text-muted-foreground">{test.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={testInvalidEmail}>
                Testar Email Inválido
              </Button>
              <Button variant="outline" onClick={testValidEmail}>
                Testar Email Válido
              </Button>
              <Button variant="outline" onClick={() => setValue('email1', '')}>
                Limpar Campo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card className="border-gray-200 bg-white/90">
          <CardHeader>
            <CardTitle>Estatísticas de Validação</CardTitle>
            <CardDescription>
              Status atual dos campos de email no formulário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Email Principal</h4>
                <div className="text-sm">
                  {email1 ? (
                    errors.email1 ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Inválido: {errors.email1.message}
                      </span>
                    ) : (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Válido: {email1}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">Vazio</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Email Secundário</h4>
                <div className="text-sm">
                  {email2 ? (
                    errors.email2 ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Inválido: {errors.email2.message}
                      </span>
                    ) : (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Válido: {email2}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">Opcional - vazio</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Email Corporativo</h4>
                <div className="text-sm">
                  {email3 ? (
                    errors.email3 ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Inválido: {errors.email3.message}
                      </span>
                    ) : (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Válido: {email3}
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">Vazio</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Resumo do Formulário</h4>
              <div className="text-sm space-y-1">
                <p>Campos válidos: {Object.keys(errors).length === 0 ? '3' : '2'}</p>
                <p>Campos com erro: {Object.keys(errors).length}</p>
                <p>Status: {Object.keys(errors).length === 0 ? (
                  <span className="text-green-600 font-medium">✓ Pronto para envio</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Corrija os erros</span>
                )}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}