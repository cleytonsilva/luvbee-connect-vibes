import { supabase } from '@/integrations/supabase';
import { safeLog } from '@/lib/safe-log';

export interface TableSchema {
  tableName: string;
  columns: string[];
  primaryKey?: string;
  foreignKeys?: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
}

export interface SchemaValidationResult {
  isValid: boolean;
  missingColumns: string[];
  extraColumns: string[];
  errors: string[];
  warnings: string[];
}

export class SchemaValidator {
  private static schemaCache: Map<string, TableSchema> = new Map();
  private static validationCache: Map<string, SchemaValidationResult> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Valida se as colunas solicitadas existem na tabela
   */
  static async validateColumns(tableName: string, requestedColumns: string[]): Promise<SchemaValidationResult> {
    const cacheKey = `${tableName}:${requestedColumns.sort().join(',')}`;
    
    // Verificar cache
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - (cached as any).timestamp < this.CACHE_TTL) {
      return cached;
    }

    try {
      // Obter schema da tabela
      const tableSchema = await this.getTableSchema(tableName);
      
      if (!tableSchema) {
        return {
          isValid: false,
          missingColumns: requestedColumns,
          extraColumns: [],
          errors: [`Tabela '${tableName}' não encontrada`],
          warnings: []
        };
      }

      const existingColumns = new Set(tableSchema.columns);
      const requestedSet = new Set(requestedColumns);

      const missingColumns = requestedColumns.filter(col => !existingColumns.has(col));
      const extraColumns = tableSchema.columns.filter(col => !requestedSet.has(col));

      const result: SchemaValidationResult = {
        isValid: missingColumns.length === 0,
        missingColumns,
        extraColumns,
        errors: missingColumns.length > 0 
          ? missingColumns.map(col => `Coluna '${col}' não existe na tabela '${tableName}'`)
          : [],
        warnings: extraColumns.length > 0 
          ? [`Colunas extras disponíveis: ${extraColumns.join(', ')}`]
          : []
      };

      // Adicionar timestamp ao cache
      (result as any).timestamp = Date.now();
      this.validationCache.set(cacheKey, result);

      // Log para desenvolvimento
      if (!result.isValid) {
        safeLog('error', `[SchemaValidator] Schema validation failed for ${tableName}`, {
          requestedColumns,
          missingColumns,
          existingColumns: Array.from(existingColumns)
        });
      }

      return result;

    } catch (error) {
      safeLog('error', `[SchemaValidator] Error validating schema for ${tableName}`, { error });
      
      return {
        isValid: false,
        missingColumns: requestedColumns,
        extraColumns: [],
        errors: [`Erro ao validar schema: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Obtém o schema de uma tabela do Supabase
   */
  private static async getTableSchema(tableName: string): Promise<TableSchema | null> {
    // Verificar cache
    const cached = this.schemaCache.get(tableName);
    if (cached && Date.now() - (cached as any).timestamp < this.CACHE_TTL) {
      return cached;
    }

    try {
      // Query para obter informações das colunas
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: tableName });

      if (error || !data || data.length === 0) {
        safeLog('warn', `[SchemaValidator] Table ${tableName} not found or error getting schema`, { error });
        return null;
      }

      const columns = data.map((col: any) => col.column_name);
      const primaryKey = data.find((col: any) => col.is_primary_key)?.column_name;

      const schema: TableSchema = {
        tableName,
        columns,
        primaryKey
      };

      // Adicionar timestamp ao cache
      (schema as any).timestamp = Date.now();
      this.schemaCache.set(tableName, schema);

      return schema;

    } catch (error) {
      safeLog('error', `[SchemaValidator] Error getting table schema for ${tableName}`, { error });
      return null;
    }
  }

  /**
   * Valida uma query SELECT antes de executá-la
   */
  static async validateSelectQuery(
    tableName: string, 
    selectColumns: string[], 
    context: string = 'unknown'
  ): Promise<{ isValid: boolean; safeColumns: string[]; errors: string[] }> {
    
    const validation = await this.validateColumns(tableName, selectColumns);
    
    if (validation.isValid) {
      return {
        isValid: true,
        safeColumns: selectColumns,
        errors: []
      };
    }

    // Se houver colunas faltantes, tentar criar uma query segura
    const safeColumns = selectColumns.filter(col => !validation.missingColumns.includes(col));
    
    if (safeColumns.length === 0) {
      safeLog('error', `[SchemaValidator] No valid columns for query in ${context}`, {
        tableName,
        requestedColumns: selectColumns,
        missingColumns: validation.missingColumns
      });
      
      return {
        isValid: false,
        safeColumns: [],
        errors: validation.errors
      };
    }

    safeLog('warn', `[SchemaValidator] Partial validation success in ${context}`, {
      tableName,
      requestedColumns: selectColumns,
      missingColumns: validation.missingColumns,
      safeColumns
    });

    return {
      isValid: true, // Parcialmente válido
      safeColumns,
      errors: validation.errors
    };
  }

  /**
   * Cria uma função RPC para obter schema (se não existir)
   */
  static async createGetTableColumnsFunction(): Promise<void> {
    try {
      const { error } = await supabase.rpc('get_table_columns', { table_name: 'test' });
      
      // Se a função não existe, criar
      if (error && error.code === '42883') { // function does not exist
        safeLog('info', '[SchemaValidator] Creating get_table_columns function');
        
        const { error: createError } = await supabase.rpc('create_get_table_columns_function');
        
        if (createError) {
          safeLog('warn', '[SchemaValidator] Could not create get_table_columns function', { createError });
        }
      }
    } catch (error) {
      safeLog('warn', '[SchemaValidator] Error checking get_table_columns function', { error });
    }
  }

  /**
   * Limpa os caches (útil para desenvolvimento)
   */
  static clearCache(): void {
    this.schemaCache.clear();
    this.validationCache.clear();
    safeLog('info', '[SchemaValidator] Cache cleared');
  }

  /**
   * Obtém estatísticas do cache
   */
  static getCacheStats(): {
    schemaCacheSize: number;
    validationCacheSize: number;
    totalCachedItems: number;
  } {
    return {
      schemaCacheSize: this.schemaCache.size,
      validationCacheSize: this.validationCache.size,
      totalCachedItems: this.schemaCache.size + this.validationCache.size
    };
  }
}

export default SchemaValidator;