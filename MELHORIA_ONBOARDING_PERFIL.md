# 🎨 Melhoria do Onboarding: Perfil Completo

## 📋 Resumo

Melhorado o fluxo de onboarding para coletar informações essenciais do perfil do usuário antes das preferências, incluindo foto, bio, idade e cidade.

---

## ✅ O Que Foi Implementado

### Novo Fluxo de Onboarding (5 Passos)

**Antes:** 3 passos apenas com preferências
**Agora:** 5 passos com perfil completo + preferências

#### Passo 1: Foto de Perfil 📸
- Upload de foto de perfil
- Preview da foto antes de continuar
- Validação de tipo (apenas imagens)
- Validação de tamanho (máximo 5MB)
- Upload para Supabase Storage (bucket `avatars`)
- Opção de remover e trocar foto

#### Passo 2: Bio, Idade e Cidade 📝
- **Bio:** Campo de texto com mínimo de 10 caracteres e máximo de 500
- **Idade:** Campo numérico com validação (18-120 anos)
- **Cidade:** Campo de texto para cidade do usuário
- Validações em tempo real
- Contador de caracteres para bio

#### Passo 3-5: Preferências (mantidas)
- Passo 3: Bebidas favoritas
- Passo 4: Comidas favoritas
- Passo 5: Música favorita

---

## 📁 Arquivos Modificados

### Componentes
- ✅ `src/components/auth/OnboardingFlow.tsx` - Fluxo completo reescrito

### Validações
- ✅ `src/lib/validations.ts` - Schema atualizado para incluir `photos` e `location`

---

## 🔄 Fluxo Completo

```
Passo 1: Foto
  ↓
Passo 2: Bio, Idade, Cidade
  ↓
Passo 3: Bebidas
  ↓
Passo 4: Comidas
  ↓
Passo 5: Música
  ↓
Salvar tudo e redirecionar
```

---

## 🎯 Funcionalidades Implementadas

### Upload de Foto
- ✅ Upload para Supabase Storage (`avatars` bucket)
- ✅ Preview antes de salvar
- ✅ Validação de tipo e tamanho
- ✅ Feedback visual durante upload
- ✅ Opção de remover foto

### Validações
- ✅ Foto obrigatória no passo 1
- ✅ Bio obrigatória (mínimo 10 caracteres)
- ✅ Idade obrigatória (18-120 anos)
- ✅ Cidade obrigatória
- ✅ Preferências obrigatórias (mínimo 1 por categoria)

### UX Melhorada
- ✅ Indicador de progresso (5 passos)
- ✅ Botões de navegação (Voltar/Próximo)
- ✅ Mensagens de erro claras
- ✅ Loading states durante salvamento
- ✅ Toast notifications para feedback

---

## 💾 Dados Salvos

### No Perfil do Usuário (`users` table)
- `photos`: Array com URL da foto de perfil
- `bio`: Texto da bio do usuário
- `age`: Idade do usuário (número)
- `location`: Cidade do usuário (string)

### Nas Preferências (`user_preferences` table)
- `drink_preferences`: Array de bebidas favoritas
- `food_preferences`: Array de comidas favoritas
- `music_preferences`: Array de estilos musicais
- `vibe_preferences`: Objeto com ambiente, horário e frequência

---

## 🧪 Como Testar

### 1. Cadastro e Onboarding
1. Criar nova conta
2. Confirmar email
3. Ser redirecionado para onboarding

### 2. Passo 1 - Foto
1. Clicar em "Escolher foto"
2. Selecionar uma imagem
3. Ver preview da foto
4. Clicar em "Próximo"

### 3. Passo 2 - Bio, Idade e Cidade
1. Preencher bio (mínimo 10 caracteres)
2. Informar idade (18-120)
3. Informar cidade
4. Clicar em "Próximo"

### 4. Passos 3-5 - Preferências
1. Selecionar preferências em cada passo
2. Avançar até o passo 5
3. Clicar em "Finalizar"

### 5. Verificar Dados Salvos
1. Verificar no Supabase Dashboard se os dados foram salvos
2. Verificar se a foto está no bucket `avatars`
3. Verificar se bio, idade e cidade estão na tabela `users`
4. Verificar se preferências estão na tabela `user_preferences`

---

## 🔧 Configuração Necessária

### Supabase Storage
Certifique-se de que o bucket `avatars` existe e está configurado:

1. **Acessar:** Supabase Dashboard > Storage > Buckets
2. **Verificar bucket `avatars`:**
   - ✅ Público: Sim
   - ✅ File size limit: 5 MB
   - ✅ Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### RLS Policies
Verificar se há políticas RLS que permitem upload:

```sql
-- Política para upload de avatares
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 📝 Validações Implementadas

### Foto
- ✅ Tipo: Apenas imagens (`image/*`)
- ✅ Tamanho: Máximo 5MB
- ✅ Obrigatória: Sim

### Bio
- ✅ Mínimo: 10 caracteres
- ✅ Máximo: 500 caracteres
- ✅ Obrigatória: Sim

### Idade
- ✅ Tipo: Número inteiro
- ✅ Mínimo: 18 anos
- ✅ Máximo: 120 anos
- ✅ Obrigatória: Sim

### Cidade
- ✅ Tipo: String
- ✅ Máximo: 100 caracteres
- ✅ Obrigatória: Sim

---

## 🎨 Componentes UI Utilizados

- `Card` - Container principal
- `Button` - Botões de navegação e ações
- `Input` - Campos de idade e cidade
- `Textarea` - Campo de bio
- `Label` - Labels dos campos
- `Badge` - Seleção de preferências
- `Alert` - Mensagens de erro
- `Loader2` - Indicador de loading

---

## 🆘 Troubleshooting

### Problema: Upload de foto falha

**Possíveis causas:**
1. Bucket `avatars` não existe
2. RLS bloqueando upload
3. Tamanho do arquivo muito grande

**Solução:**
1. Verificar se bucket existe no Supabase
2. Verificar políticas RLS
3. Verificar tamanho do arquivo (máximo 5MB)

### Problema: Dados não são salvos

**Possíveis causas:**
1. Validação Zod falhando
2. Erro no banco de dados
3. RLS bloqueando atualização

**Solução:**
1. Verificar logs do console
2. Verificar mensagens de erro
3. Verificar políticas RLS na tabela `users`

---

## ✅ Próximos Passos

1. ✅ Implementação concluída
2. ⏳ Testar em ambiente de desenvolvimento
3. ⏳ Testar upload de fotos
4. ⏳ Verificar salvamento de dados
5. ⏳ Testar validações

---

**Última atualização:** Onboarding melhorado e pronto para teste ✅

