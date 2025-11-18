# Integração Supabase - Requisitos Técnicos

## 1. Visão Geral do Projeto

O Luvbee Connect Vibes é uma aplicação de conectividade social voltada para o universo da noite e entretenimento. A integração com Supabase visa modernizar a infraestrutura de dados, implementar autenticação segura e garantir escalabilidade do sistema.

**Objetivo Principal**: Migrar a estrutura de dados atual para Supabase, implementando segurança RLS e mantendo todas as funcionalidades CRUD operacionais.

## 2. Análise da Estrutura Atual

### 2.1 Componentes Existentes
A aplicação atual possui os seguintes componentes principais:
- **Pages**: Auth, Chat, LocationDetail, Locations, PeopleMatch, Profile, Settings, Welcome
- **Components**: LocationCard, PersonCard, NavLink, UI components
- **Hooks**: use-mobile, use-toast

### 2.2 Assets e Recursos
- Imagens de bares e pessoas (bar-1.jpg, bar-2.jpg, bar-3.jpg, person-1.jpg, etc.)
- Hero section com imagem de nightlife
- Sistema de navegação entre páginas

## 3. Requisitos de Integração

### 3.1 Configuração da Conexão Supabase

#### 3.1.1 Credenciais e Segurança
```typescript
// src/integrations/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)
```

#### 3.1.2 Variáveis de Ambiente
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_SERVICE_KEY=[service-key] // Para operações administrativas
```

### 3.2 Schema do Banco de Dados

#### 3.2.1 Tabelas Principais

**users (usuários)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  preferences JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**locations (estabelecimentos)**
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  images TEXT[],
  rating DECIMAL(3,2) DEFAULT 0,
  phone VARCHAR(20),
  website TEXT,
  opening_hours JSONB,
  location POINT,
  owner_id UUID REFERENCES users(id),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**matches (conexões entre usuários)**
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  matched_user_id UUID REFERENCES users(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, matched_user_id)
);
```

**messages (chat)**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) NOT NULL,
  receiver_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**check_ins (presenças em locais)**
```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  location_id UUID REFERENCES locations(id) NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_out_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);
```

### 3.3 Políticas de Segurança RLS

#### 3.3.1 Tabela Users
```sql
-- Permitir leitura de todos os usuários ativos
CREATE POLICY "users_read_active" ON users
  FOR SELECT USING (is_active = true);

-- Permitir atualização apenas do próprio perfil
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Permitir leitura do próprio perfil completo
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);
```

#### 3.3.2 Tabela Locations
```sql
-- Permitir leitura de todos os locais verificados
CREATE POLICY "locations_read_verified" ON locations
  FOR SELECT USING (is_verified = true);

-- Permitir CRUD completo para proprietários
CREATE POLICY "locations_manage_own" ON locations
  FOR ALL USING (auth.uid() = owner_id);
```

#### 3.3.3 Tabela Matches
```sql
-- Permitir leitura apenas dos próprios matches
CREATE POLICY "matches_read_own" ON matches
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- Permitir criação de matches
CREATE POLICY "matches_create" ON matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir atualização apenas dos próprios matches
CREATE POLICY "matches_update_own" ON matches
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = matched_user_id);
```

#### 3.3.4 Tabela Messages
```sql
-- Permitir leitura apenas das próprias mensagens
CREATE POLICY "messages_read_own" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Permitir envio de mensagens
CREATE POLICY "messages_send" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
```

## 4. Migração de Dados

### 4.1 Script de Migração
```typescript
// src/migrations/migrate-to-supabase.ts
import { supabase } from '../integrations/supabase'

export async function migrateData() {
  try {
    // 1. Backup dos dados atuais
    const backup = await createBackup()
    
    // 2. Migração de usuários
    await migrateUsers()
    
    // 3. Migração de locais
    await migrateLocations()
    
    // 4. Migração de matches
    await migrateMatches()
    
    // 5. Validação da migração
    await validateMigration()
    
    console.log('Migração concluída com sucesso')
  } catch (error) {
    // Rollback em caso de erro
    await rollbackMigration()
    throw error
  }
}
```

### 4.2 Validações
- Verificar integridade referencial
- Validar unicidade de emails
- Confirmar conversão de tipos de dados
- Testar índices e performance

### 4.3 Sistema de Rollback
```typescript
export async function rollbackMigration() {
  // Restaurar backup
  await restoreBackup()
  
  // Limpar dados migrados
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  console.log('Rollback executado com sucesso')
}
```

## 5. Atualização dos Componentes

### 5.1 Serviços de API
```typescript
// src/services/auth.service.ts
import { supabase } from '../integrations/supabase'

export class AuthService {
  static async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })
    return { data, error }
  }
  
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }
  
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }
}
```

### 5.2 Hooks Customizados
```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  return { user, loading }
}
```

### 5.3 Atualização de Componentes

**Auth.tsx**
- Integrar com Supabase Auth
- Implementar validação de formulários
- Adicionar estados de loading

**Profile.tsx**
- Carregar dados do usuário autenticado
- Permitir edição com validação
- Implementar upload de avatar

**Locations.tsx**
- Buscar locais do Supabase
- Implementar paginação
- Adicionar filtros por categoria

**PeopleMatch.tsx**
- Integrar com tabela de matches
- Implementar sistema de swipe
- Adicionar notificações em tempo real

## 6. Testes e Validação

### 6.1 Testes Unitários
```typescript
// __tests__/services/auth.service.test.ts
import { AuthService } from '../../src/services/auth.service'

describe('AuthService', () => {
  it('should sign up a new user', async () => {
    const result = await AuthService.signUp('test@example.com', 'password123', 'Test User')
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
  })
  
  it('should sign in with valid credentials', async () => {
    const result = await AuthService.signIn('test@example.com', 'password123')
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
  })
})
```

### 6.2 Testes de Integração
```typescript
// __tests__/integration/database.test.ts
import { supabase } from '../../src/integrations/supabase'

describe('Database Integration', () => {
  it('should enforce RLS policies', async () => {
    // Testar políticas de segurança
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    // Verificar se apenas dados autorizados são retornados
    expect(error).toBeNull()
  })
  
  it('should handle CRUD operations', async () => {
    // Testar operações CRUD em cada tabela
    const testData = {
      name: 'Test Location',
      address: 'Test Address',
      category: 'bar'
    }
    
    const { data, error } = await supabase
      .from('locations')
      .insert(testData)
      .select()
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})
```

### 6.3 Testes de Performance
- Medir tempo de resposta das queries
- Verificar índices de banco de dados
- Testar carga com múltiplos usuários simultâneos
- Validar cache e otimizações

## 7. Plano de Deploy

### 7.1 Pré-deploy
1. Executar todos os testes
2. Fazer backup completo do banco
3. Validar variáveis de ambiente
4. Verificar permissões RLS

### 7.2 Deploy
1. Executar migração de dados
2. Atualizar componentes React
3. Configurar webhooks se necessário
4. Ativar monitoramento

### 7.3 Pós-deploy
1. Verificar logs de erro
2. Validar funcionalidades críticas
3. Monitorar performance
4. Preparar rollback se necessário

## 8. Monitoramento e Manutenção

### 8.1 Logs de Auditoria
```typescript
// src/utils/audit-logger.ts
export function logAuditEvent(event: string, userId: string, details: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    details,
    ip: getClientIP(),
    userAgent: navigator.userAgent
  }
  
  // Enviar para Supabase ou serviço de logs
  supabase.from('audit_logs').insert(logEntry)
}
```

### 8.2 Métricas de Performance
- Tempo de resposta das APIs
- Taxa de sucesso de autenticação
- Número de usuários ativos
- Performance das queries

### 8.3 Alertas
- Falhas de autenticação excessivas
- Erros de banco de dados
- Performance degradada
- Tentativas de acesso não autorizado

## 9. Conformidade com Esquads

### 9.1 Documentação
- [ ] Criar `/docs/integracao-supabase.md`
- [ ] Atualizar `INTEGRACOES.md` com configurações
- [ ] Documentar APIs e endpoints
- [ ] Criar guia de troubleshooting

### 9.2 Segurança
- [ ] Implementar RLS em todas as tabelas
- [ ] Configurar 2FA para admin
- [ ] Implementar rate limiting
- [ ] Validar inputs contra SQL injection

### 9.3 Backup
- [ ] Configurar backup automático diário
- [ ] Testar restauração mensalmente
- [ ] Armazenar backups em local seguro
- [ ] Documentar procedimento de restore

## 10. Checklist Final

### 10.1 Desenvolvimento
- [ ] Configurar conexão Supabase
- [ ] Criar schema do banco
- [ ] Implementar RLS
- [ ] Migrar dados
- [ ] Atualizar componentes
- [ ] Implementar testes

### 10.2 Segurança
- [ ] Validar todas as políticas RLS
- [ ] Configurar autenticação
- [ ] Implementar logs de auditoria
- [ ] Configurar monitoramento
- [ ] Testar permissões

### 10.3 Deploy
- [ ] Executar testes completos
- [ ] Fazer backup
- [ ] Deploy para staging
- [ ] Validação em staging
- [ ] Deploy para produção
- [ ] Monitoramento pós-deploy

Este documento deve ser revisado e aprovado antes da implementação, seguindo o fluxo de aprovação do sistema Esquads.