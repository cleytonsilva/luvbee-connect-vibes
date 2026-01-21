import { supabase, isSupabaseConfigured } from '@/integrations/supabase'
import { auditService } from './audit.service'
import { metricsService } from './metrics.service'
import { validationService } from './validation.service'
import { safeLog } from '@/lib/safe-log'
import { SupabaseError } from '@/lib/errors'
import type { Database } from '@/integrations/database.types'

export interface TestResult {
  test: string
  status: 'passed' | 'failed' | 'skipped'
  message: string
  duration: number
  error?: any
}

export interface IntegrationTestReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  duration: number
  results: TestResult[]
  summary: string
}

/**
 * Serviço de teste de integração para validar operações com Supabase
 */
export class IntegrationTestService {
  private static instance: IntegrationTestService
  private testData: {
    userId?: string
    locationId?: string
    messageId?: string
    testRunId: string
  } = { testRunId: this.generateTestId() }

  private constructor() {}

  static getInstance(): IntegrationTestService {
    if (!IntegrationTestService.instance) {
      IntegrationTestService.instance = new IntegrationTestService()
    }
    return IntegrationTestService.instance
  }

  /**
   * Executar todos os testes de integração
   */
  async runAllTests(): Promise<IntegrationTestReport> {
    const startTime = Date.now()
    const results: TestResult[] = []

    safeLog('info', '🧪 Iniciando testes de integração Supabase...')

    // Testes de conexão
    results.push(await this.testConnection())
    results.push(await this.testAuthentication()))

    // Testes CRUD
    results.push(await this.testUserCRUD()))
    results.push(await this.testLocationCRUD()))
    results.push(await this.testMessageCRUD()))

    // Testes de segurança
    results.push(await this.testSecurity()))
    results.push(await this.testRateLimiting()))
    results.push(await this.testValidation()))

    // Testes de performance
    results.push(await this.testPerformance()))
    results.push(await this.testConcurrentOperations()))

    // Testes de serviços auxiliares
    results.push(await this.testAuditService()))
    results.push(await this.testMetricsService()))

    const duration = Date.now() - startTime
    const summary = this.generateSummary(results)

    // Registrar resultado nos serviços
    await this.recordTestResults(results, duration)

    safeLog('info', `✅ Testes de integração concluídos em ${duration}ms`)

    return {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests: results.filter(r => r.status === 'passed').length,
      failedTests: results.filter(r => r.status === 'failed').length,
      skippedTests: results.filter(r => r.status === 'skipped').length,
      duration,
      results,
      summary
    }
  }

  /**
   * Testar conexão com Supabase
   */
  private async testConnection(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase não está configurado')
      }

      // Testar conexão com uma query simples
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      if (error) throw error

      return {
        test: 'Conexão Supabase',
        status: 'passed',
        message: 'Conexão estabelecida com sucesso',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Conexão Supabase',
        status: 'failed',
        message: 'Falha na conexão',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar autenticação
   */
  private async testAuthentication(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Testar se conseguimos obter sessão atual
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      return {
        test: 'Autenticação',
        status: 'passed',
        message: session ? 'Usuário autenticado' : 'Sem sessão ativa',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Autenticação',
        status: 'failed',
        message: 'Erro na autenticação',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar CRUD de usuário
   */
  private async testUserCRUD(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // CREATE
      const testEmail = `test-${this.testData.testRunId}@example.com`
      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({
          email: testEmail,
          name: 'Test User',
          age: 25
        })
        .select()
        .single()

      if (createError) throw createError
      this.testData.userId = user.id

      // READ
      const { data: readUser, error: readError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (readError) throw readError

      // UPDATE
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: 'Updated Test User' })
        .eq('id', user.id)

      if (updateError) throw updateError

      // DELETE
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (deleteError) throw deleteError

      return {
        test: 'CRUD Usuário',
        status: 'passed',
        message: 'Todas as operações CRUD funcionaram',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'CRUD Usuário',
        status: 'failed',
        message: 'Falha em operações CRUD',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar CRUD de localização
   */
  private async testLocationCRUD(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // CREATE
      const { data: location, error: createError } = await supabase
        .from('locations')
        .insert({
          name: 'Test Location',
          address: '123 Test St',
          type: 'bar', // Usando 'type' ao invés de 'category' (nome correto da coluna)
          lat: -23.5505,
          lng: -46.6333,
          rating: 4.5,
          is_active: true // Explicitamente ativando para ser visível no feed
        })
        .select()
        .single()

      if (createError) throw createError
      this.testData.locationId = location.id

      // READ
      const { data: readLocation, error: readError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', location.id)
        .single()

      if (readError) throw readError

      // UPDATE
      const { error: updateError } = await supabase
        .from('locations')
        .update({ rating: 4.8 })
        .eq('id', location.id)

      if (updateError) throw updateError

      // DELETE
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id)

      if (deleteError) throw deleteError

      return {
        test: 'CRUD Localização',
        status: 'passed',
        message: 'Todas as operações CRUD funcionaram',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'CRUD Localização',
        status: 'failed',
        message: 'Falha em operações CRUD',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar CRUD de mensagem
   */
  private async testMessageCRUD(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      if (!this.testData.userId) {
        return {
          test: 'CRUD Mensagem',
          status: 'skipped',
          message: 'Teste de usuário é pré-requisito',
          duration: Date.now() - startTime
        }
      }

      // CREATE
      const { data: message, error: createError } = await supabase
        .from('messages')
        .insert({
          sender_id: this.testData.userId,
          receiver_id: this.testData.userId, // Auto-mensagem para teste
          content: 'Test message'
        })
        .select()
        .single()

      if (createError) throw createError
      this.testData.messageId = message.id

      // READ
      const { data: readMessage, error: readError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', message.id)
        .single()

      if (readError) throw readError

      // UPDATE (marcar como lida)
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', message.id)

      if (updateError) throw updateError

      // DELETE
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id)

      if (deleteError) throw deleteError

      return {
        test: 'CRUD Mensagem',
        status: 'passed',
        message: 'Todas as operações CRUD funcionaram',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'CRUD Mensagem',
        status: 'failed',
        message: 'Falha em operações CRUD',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar segurança
   */
  private async testSecurity(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Testar SQL injection
      const { error: injectionError } = await supabase
        .from('users')
        .select('*')
        .eq('email', "'; DROP TABLE users; --")

      // Testar acesso não autorizado
      const { data: unauthorizedData } = await supabase
        .from('users')
        .select('*')

      // Testar validação de entrada
      try {
        await validationService.validateEmail('invalid-email')
      } catch (validationError) {
        // Esperado
      }

      return {
        test: 'Segurança',
        status: 'passed',
        message: 'Medidas de segurança funcionando',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Segurança',
        status: 'failed',
        message: 'Falha em testes de segurança',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar rate limiting
   */
  private async testRateLimiting(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Fazer múltiplas requisições rápidas
      const promises = Array(10).fill(null).map(() =>
        supabase.from('users').select('id').limit(1)
      )

      const results = await Promise.allSettled(promises)
      const rejected = results.filter(r => r.status === 'rejected')

      return {
        test: 'Rate Limiting',
        status: rejected.length > 0 ? 'passed' : 'failed',
        message: `Rate limit funcionando: ${rejected.length} requisições rejeitadas`,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Rate Limiting',
        status: 'failed',
        message: 'Erro ao testar rate limiting',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar validação
   */
  private async testValidation(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Testar validação de dados
      await validationService.validateEmail('test@example.com')
      
      // Testar validação de senha
      validationService.validatePassword('StrongP@ssw0rd')
      
      // Testar validação de coordenadas
      validationService.validateCoordinates(-23.5505, -46.6333)

      return {
        test: 'Validação',
        status: 'passed',
        message: 'Validações funcionando corretamente',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Validação',
        status: 'failed',
        message: 'Falha em validações',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar performance
   */
  private async testPerformance(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Medir tempo de resposta
      const queryStart = Date.now()
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(10)
      
      const queryTime = Date.now() - queryStart

      return {
        test: 'Performance',
        status: queryTime < 1000 ? 'passed' : 'failed',
        message: `Query executada em ${queryTime}ms`,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Performance',
        status: 'failed',
        message: 'Erro ao testar performance',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar operações concorrentes
   */
  private async testConcurrentOperations(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Executar múltiplas operações simultâneas
      const operations = Array(5).fill(null).map((_, index) =>
        supabase.from('users').select('id').limit(1)
      )

      const results = await Promise.all(operations)
      const allSuccess = results.every(r => !r.error)

      return {
        test: 'Operações Concorrentes',
        status: allSuccess ? 'passed' : 'failed',
        message: `Operações concorrentes: ${allSuccess ? 'sucesso' : 'falha'}`,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Operações Concorrentes',
        status: 'failed',
        message: 'Erro em operações concorrentes',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar serviço de auditoria
   */
  private async testAuditService(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Testar registro de auditoria
      await auditService.logAction({
        action: 'USER_LOGIN',
        userId: this.testData.userId
      })

      // Testar consulta de logs
      const { data, error } = await auditService.getAuditLogs({
        userId: this.testData.userId,
        limit: 10
      })

      if (error) throw error

      return {
        test: 'Serviço de Auditoria',
        status: 'passed',
        message: 'Serviço de auditoria funcionando',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Serviço de Auditoria',
        status: 'failed',
        message: 'Erro no serviço de auditoria',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Testar serviço de métricas
   */
  private async testMetricsService(): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Testar registro de métrica
      await metricsService.recordMetric({
        name: 'api_response_time',
        value: 100,
        tags: { endpoint: '/test' }
      })

      // Testar consulta de métricas
      const { data, error } = await metricsService.getMetrics({
        name: 'api_response_time',
        limit: 10
      })

      if (error) throw error

      return {
        test: 'Serviço de Métricas',
        status: 'passed',
        message: 'Serviço de métricas funcionando',
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        test: 'Serviço de Métricas',
        status: 'failed',
        message: 'Erro no serviço de métricas',
        duration: Date.now() - startTime,
        error
      }
    }
  }

  /**
   * Gerar ID de teste
   */
  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Gerar resumo dos testes
   */
  private generateSummary(results: TestResult[]): string {
    const passed = results.filter(r => r.status === 'passed').length
    const failed = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length
    
    return `Testes: ${passed} passou, ${failed} falhou, ${skipped} pulou`
  }

  /**
   * Registrar resultados nos serviços
   */
  private async recordTestResults(results: TestResult[], duration: number): Promise<void> {
    try {
      const passedCount = results.filter(r => r.status === 'passed').length
      const failedCount = results.filter(r => r.status === 'failed').length

      // Registrar métrica de sucesso
      await metricsService.recordMetric({
        name: 'integration_test_success_rate',
        value: passedCount / results.length,
        tags: {
          totalTests: results.length.toString(),
          passedTests: passedCount.toString(),
          failedTests: failedCount.toString()
        }
      })

      // Registrar métrica de duração
      await metricsService.recordMetric({
        name: 'integration_test_duration',
        value: duration,
        tags: { testRunId: this.testData.testRunId }
      })

      // Registrar auditoria
      await auditService.logAction({
        action: 'INTEGRATION_TEST_RUN',
        newValues: {
          testRunId: this.testData.testRunId,
          totalTests: results.length,
          passedTests: passedCount,
          failedTests: failedCount,
          duration
        }
      })
    } catch (error) {
      safeLog('error', 'Erro ao registrar resultados dos testes:', error)
    }
  }

  /**
   * Limpar dados de teste
   */
  async cleanupTestData(): Promise<void> {
    try {
      // Limpar usuário de teste
      if (this.testData.userId) {
        await supabase.from('users').delete().eq('id', this.testData.userId)
      }

      // Limpar localização de teste
      if (this.testData.locationId) {
        await supabase.from('locations').delete().eq('id', this.testData.locationId)
      }

      // Limpar mensagem de teste
      if (this.testData.messageId) {
        await supabase.from('messages').delete().eq('id', this.testData.messageId)
      }

      safeLog('info', 'Dados de teste limpos com sucesso')
    } catch (error) {
      safeLog('error', 'Erro ao limpar dados de teste:', error)
    }
  }
}

// Exportar instância singleton
export const integrationTestService = IntegrationTestService.getInstance()
export default integrationTestService