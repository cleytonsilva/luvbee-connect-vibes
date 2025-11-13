/**
 * Migration Manager - Sistema de migrações para Supabase
 * 
 * Gerencia aplicação de migrações SQL de forma segura e controlada
 * com suporte para rollback e verificações de integridade
 */

import { supabase } from '@/integrations/supabase'

export interface Migration {
  id: string
  name: string
  up: string
  down: string
  checksum?: string
}

export interface MigrationResult {
  success: boolean
  message: string
  appliedMigrations?: string[]
  error?: string
}

export class MigrationManager {
  private static readonly MIGRATIONS_TABLE = 'schema_migrations'
  
  /**
   * Inicializa a tabela de controle de migrações
   */
  static async initialize(): Promise<boolean> {
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.MIGRATIONS_TABLE} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          checksum VARCHAR(64),
          applied_by UUID REFERENCES auth.users(id)
        );
      `
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql: createTableSQL 
      })
      
      if (error) {
        console.error('Erro ao criar tabela de migrações:', error)
        return false
      }
      
      console.log('✅ Sistema de migrações inicializado')
      return true
    } catch (error) {
      console.error('Erro ao inicializar sistema de migrações:', error)
      return false
    }
  }
  
  /**
   * Verifica se uma migração já foi aplicada
   */
  static async isMigrationApplied(migrationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.MIGRATIONS_TABLE)
        .select('id')
        .eq('id', migrationId)
        .single()
      
      return !error && !!data
    } catch (error) {
      console.error('Erro ao verificar migração:', error)
      return false
    }
  }
  
  /**
   * Aplica uma migração única com transação e rollback
   */
  static async applyMigration(migration: Migration, userId?: string): Promise<boolean> {
    const client = await this.getTransactionClient()
    
    try {
      // Verificar se já foi aplicada
      const isApplied = await this.isMigrationApplied(migration.id)
      if (isApplied) {
        console.log(`Migração ${migration.id} já aplicada, pulando...`)
        return true
      }
      
      console.log(`Aplicando migração: ${migration.id} - ${migration.name}`)
      
      // Executar SQL da migração
      const { error: execError } = await client.rpc('exec_sql', { 
        sql: migration.up 
      })
      
      if (execError) {
        throw new Error(`Erro ao executar migração: ${execError.message}`)
      }
      
      // Registrar migração aplicada
      const { error: recordError } = await client
        .from(this.MIGRATIONS_TABLE)
        .insert({
          id: migration.id,
          name: migration.name,
          checksum: migration.checksum,
          applied_by: userId
        })
      
      if (recordError) {
        throw new Error(`Erro ao registrar migração: ${recordError.message}`)
      }
      
      console.log(`✅ Migração ${migration.id} aplicada com sucesso`)
      return true
      
    } catch (error) {
      console.error(`❌ Erro ao aplicar migração ${migration.id}:`, error)
      
      // Tentar rollback
      try {
        await this.rollbackMigration(migration, client)
      } catch (rollbackError) {
        console.error('Erro durante rollback:', rollbackError)
      }
      
      return false
    }
  }
  
  /**
   * Executa rollback de uma migração
   */
  static async rollbackMigration(migration: Migration, client?: any): Promise<boolean> {
    const transactionClient = client || supabase
    
    try {
      console.log(`Executando rollback da migração: ${migration.id}`)
      
      // Executar SQL de rollback
      const { error: rollbackError } = await transactionClient.rpc('exec_sql', { 
        sql: migration.down 
      })
      
      if (rollbackError) {
        throw new Error(`Erro ao executar rollback: ${rollbackError.message}`)
      }
      
      // Remover registro da migração
      const { error: deleteError } = await transactionClient
        .from(this.MIGRATIONS_TABLE)
        .delete()
        .eq('id', migration.id)
      
      if (deleteError) {
        throw new Error(`Erro ao remover registro: ${deleteError.message}`)
      }
      
      console.log(`✅ Rollback da migração ${migration.id} concluído`)
      return true
      
    } catch (error) {
      console.error(`❌ Erro durante rollback da migração ${migration.id}:`, error)
      return false
    }
  }
  
  /**
   * Aplica múltiplas migrações em ordem
   */
  static async applyMigrations(migrations: Migration[], userId?: string): Promise<MigrationResult> {
    const results: string[] = []
    
    try {
      // Inicializar sistema de migrações
      await this.initialize()
      
      // Ordenar migrações por ID (timestamp)
      const sortedMigrations = migrations.sort((a, b) => a.id.localeCompare(b.id))
      
      for (const migration of sortedMigrations) {
        const success = await this.applyMigration(migration, userId)
        if (success) {
          results.push(migration.id)
        } else {
          return {
            success: false,
            message: `Falha ao aplicar migração ${migration.id}`,
            appliedMigrations: results,
            error: `Migração ${migration.id} falhou`
          }
        }
      }
      
      return {
        success: true,
        message: `✅ ${results.length} migrações aplicadas com sucesso`,
        appliedMigrations: results
      }
      
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao aplicar migrações',
        appliedMigrations: results,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  /**
   * Lista todas as migrações aplicadas
   */
  static async getAppliedMigrations(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from(this.MIGRATIONS_TABLE)
        .select('id, name, applied_at')
        .order('applied_at', { ascending: true })
      
      if (error) {
        console.error('Erro ao buscar migrações aplicadas:', error)
        return []
      }
      
      return data?.map(m => m.id) || []
    } catch (error) {
      console.error('Erro ao listar migrações:', error)
      return []
    }
  }
  
  /**
   * Verifica integridade do schema
   */
  static async verifySchemaIntegrity(): Promise<boolean> {
    try {
      // Verificar tabelas principais
      const tables = ['users', 'locations', 'matches', 'messages', 'cached_place_photos']
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
      
        if (error && error.code !== 'PGRST116') { // Tabela não existe
          console.error(`❌ Tabela ${table} não encontrada ou com erro:`, error)
          return false
        }
      }
      
      // Verificar bucket de storage
      const { data: buckets } = await supabase.storage.listBuckets()
      const hasDivBucket = buckets?.some(b => b.id === 'div')
      
      if (!hasDivBucket) {
        console.error('❌ Bucket div não encontrado')
        return false
      }
      
      console.log('✅ Integridade do schema verificada')
      return true
      
    } catch (error) {
      console.error('Erro ao verificar integridade do schema:', error)
      return false
    }
  }
  
  /**
   * Obtém cliente de transação (simulado com RPC)
   */
  private static async getTransactionClient(): Promise<any> {
    // Em produção, usar transações reais do Supabase
    // Por enquanto, retornamos o cliente normal com logging
    return {
      ...supabase,
      rpc: async (name: string, params: any) => {
        console.log(`[TRANSACTION] Executando: ${name}`, params)
        return supabase.rpc(name, params)
      },
      from: (table: string) => {
        console.log(`[TRANSACTION] Acessando tabela: ${table}`)
        return supabase.from(table)
      }
    }
  }
}

// Exportar funções auxiliares
export const migrationManager = {
  initialize: MigrationManager.initialize,
  applyMigrations: MigrationManager.applyMigrations,
  getAppliedMigrations: MigrationManager.getAppliedMigrations,
  verifySchemaIntegrity: MigrationManager.verifySchemaIntegrity,
  isMigrationApplied: MigrationManager.isMigrationApplied
}