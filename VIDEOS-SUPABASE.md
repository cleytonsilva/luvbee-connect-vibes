# Configuração de Vídeos no Supabase Storage

## 📹 Vídeos da Hero Section

Os vídeos de fundo da hero section agora são carregados do Supabase Storage ao invés de arquivos locais.

## 🔧 Configuração

### 1. Criar Bucket no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **Storage** > **Buckets**
3. Clique em **New bucket**
4. Nome do bucket: `hero-videos`
5. Marque como **Public bucket** (para acesso público)

### 2. Fazer Upload dos Vídeos

1. Clique no bucket `hero-videos`
2. Clique em **Upload file**
3. Faça upload dos seguintes vídeos (nomes exatos):
   - `6010326_Person_Human_3840x2160.mp4`
   - `6994078_Rave_Club_Culture_3840x2160.mp4`
   - `4933420_Dj_Deejay_3840x2160.mp4`
   - `6309021_Women_Woman_3840x2160.mp4`

### 3. Verificar Políticas de Acesso

Certifique-se de que o bucket tem políticas públicas para leitura:

```sql
-- Política para leitura pública do bucket hero-videos
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-videos');
```

## 📝 Ajustar Nomes dos Vídeos

Se os nomes dos arquivos no seu bucket forem diferentes, edite o arquivo:

`src/services/video.service.ts`

E atualize o array `VIDEO_FILENAMES` com os nomes exatos dos seus arquivos:

```typescript
const VIDEO_FILENAMES = [
  'seu-video-1.mp4',
  'seu-video-2.mp4',
  'seu-video-3.mp4',
  'seu-video-4.mp4',
]
```

## ✅ Como Funciona

1. O hook `useHeroVideos()` carrega as URLs públicas dos vídeos do Supabase Storage
2. Os vídeos são reproduzidos sequencialmente na hero section
3. Quando um vídeo termina, o próximo é carregado automaticamente
4. Os vídeos são servidos via CDN do Supabase (rápido e otimizado)

## 🔍 Troubleshooting

### Vídeos não aparecem

1. Verifique se o bucket `hero-videos` existe
2. Verifique se os nomes dos arquivos estão corretos
3. Verifique se o bucket é público
4. Verifique o console do navegador para erros

### Erro de CORS

Se houver erros de CORS, verifique as políticas do bucket no Supabase Dashboard.

## 📚 Recursos

- [Documentação Supabase Storage](https://supabase.com/docs/guides/storage)
- [Políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control)

