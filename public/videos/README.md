# Vídeos do Projeto

Os vídeos de fundo da hero section devem ser hospedados em um CDN ou storage externo (ex: Supabase Storage, Cloudflare R2, AWS S3).

## 📹 Vídeos Necessários

Os seguintes vídeos são usados na hero section da página inicial:

1. `4932857_Dj_Deejay_3840x2160.mp4` (55 MB)
2. `4933420_Dj_Deejay_3840x2160.mp4` (39 MB)
3. `6010326_Person_Human_3840x2160.mp4` (137 MB)
4. `6309021_Women_Woman_3840x2160.mp4` (68 MB)
5. `6994078_Rave_Club_Culture_3840x2160.mp4` (26 MB)

## 🚀 Como Configurar

### Opção 1: Supabase Storage

1. Crie um bucket público chamado `hero-videos` no Supabase
2. Faça upload dos vídeos para o bucket
3. Atualize as URLs no código para usar as URLs públicas do Supabase

### Opção 2: CDN Externo

1. Faça upload dos vídeos para seu CDN preferido
2. Atualize as URLs no arquivo `src/pages/Welcome.tsx` e `src/pages/HomePage.tsx`

## ⚠️ Importante

- **Não commite vídeos grandes no Git** - Eles excedem os limites do GitHub (100 MB)
- Use sempre URLs públicas de um CDN ou storage externo
- Considere usar formatos otimizados (WebM, H.264) para melhor performance

