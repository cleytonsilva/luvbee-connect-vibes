// Serviços principais de integração Supabase
export { auditService } from './audit.service'
export { metricsService } from './metrics.service'
export { validationService } from './validation.service'
export { integrationTestService } from './integration-test.service'
export { monitorService } from './monitor.service'

// Tipos exportados
export type {
  AuditLog,
  AuditLogFilters,
  CreateAuditLogData,
  AuditStats
} from './audit.service'

export type {
  Metric,
  MetricData,
  MetricFilters,
  AlertConfig,
  MetricStats,
  MetricDashboard
} from './metrics.service'

export type {
  UserValidationData,
  LocationValidationData,
  MessageValidationData,
  ReviewValidationData,
  ValidationResult,
  FileValidationData
} from './validation.service'

export type {
  TestResult,
  IntegrationTestReport
} from './integration-test.service'

export type {
  SystemHealth,
  HealthCheck,
  SystemMetrics,
  Alert
} from './monitor.service'

// Funções utilitárias
export { safeLog } from '@/lib/safe-log'
export { SupabaseError } from '@/lib/errors'

// Serviços auxiliares
export * from './auth.service'
export * from './user.service'
export * from './location.service'
export * from './chat.service'
export * from './match.service'
export * from './compatibility.service'
export * from './imageCache'
export * from './image-storage.service'

// Configuração de testes
export const testConfig = {
  // Configurações para testes de integração
  integration: {
    timeout: 30000, // 30 segundos
    retryAttempts: 3,
    cleanupAfterTest: true,
    generateTestData: true
  },
  
  // Configurações de monitoramento
  monitoring: {
    healthCheckInterval: 30000, // 30 segundos
    alertRetentionDays: 7,
    metricsRetentionDays: 30,
    auditLogRetentionDays: 90
  },
  
  // Configurações de validação
  validation: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxMessageLength: 1000,
    minPasswordLength: 8,
    maxAge: 120,
    minAge: 18
  },
  
  // Configurações de segurança
  security: {
    rateLimitWindow: 15 * 60 * 1000, // 15 minutos
    maxRequestsPerWindow: 100,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutos
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 horas
  }
}

// Helper para inicializar todos os serviços
export async function initializeIntegrationServices(): Promise<void> {
  try {
    console.log('🚀 Inicializando serviços de integração...')
    
    // Iniciar monitoramento
    monitorService.startMonitoring(testConfig.monitoring.healthCheckInterval)
    
    // Executar teste de integração inicial
    const testResults = await integrationTestService.runAllTests()
    
    console.log(`✅ Serviços inicializados com sucesso`)
    console.log(`📊 Testes de integração: ${testResults.passedTests}/${testResults.totalTests} passaram`)
    
    if (testResults.failedTests > 0) {
      console.warn(`⚠️ ${testResults.failedTests} testes falharam - verificar configurações`)
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error)
    throw error
  }
}

// Helper para parar serviços
export function shutdownIntegrationServices(): void {
  try {
    console.log('🛑 Parando serviços de integração...')
    
    // Parar monitoramento
    monitorService.stopMonitoring()
    
    console.log('✅ Serviços parados com sucesso')
  } catch (error) {
    console.error('❌ Erro ao parar serviços:', error)
  }
}

// Exportar configurações de ambiente
export const integrationConfig = {
  // URLs e endpoints
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  appUrl: process.env.VITE_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.VITE_API_URL || '/api',
  
  // Configurações de CORS
  cors: {
    allowedOrigins: [
      'https://luvbee.com.br',
      'https://www.luvbee.com.br',
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400 // 24 horas
  },
  
  // Configurações de segurança
  security: {
    enableRateLimiting: true,
    enableCORS: true,
    enableAuditLogging: true,
    enableMetrics: true,
    enableValidation: true
  }
}