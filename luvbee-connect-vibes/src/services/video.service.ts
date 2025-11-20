import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase'

/**
 * Nomes dos vídeos no bucket do Supabase Storage
 * Ordem de reprodução na hero section
 * Vídeos confirmados no bucket hero-videos
 */
const VIDEO_FILENAMES = [
  '6994078_Rave_Club_Culture_3840x2160.mp4',
  '4933420_Dj_Deejay_3840x2160.mp4',
  '6309021_Women_Woman_3840x2160.mp4',
  '4932857_Dj_Deejay_3840x2160.mp4',
]

const BUCKET_NAME = 'hero-videos'

/**
 * Obtém a URL pública de um vídeo do Supabase Storage
 */
export async function getVideoUrl(filename: string): Promise<string | null> {
  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename)

    return data.publicUrl
  } catch (error) {
    console.error(`Erro ao obter URL do vídeo ${filename}:`, error)
    return null
  }
}

/**
 * Obtém todas as URLs dos vídeos da hero section
 */
export async function getHeroVideoUrls(): Promise<string[]> {
  try {
    const urls = await Promise.all(
      VIDEO_FILENAMES.map(filename => getVideoUrl(filename))
    )

    // Filtrar URLs nulas e retornar apenas as válidas
    return urls.filter((url): url is string => url !== null)
  } catch (error) {
    console.error('Erro ao obter URLs dos vídeos:', error)
    return []
  }
}

/**
 * Hook para usar vídeos da hero section
 * Retorna URLs dos vídeos do Supabase Storage
 */
export function useHeroVideos() {
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadVideos() {
      setIsLoading(true)
      const urls = await getHeroVideoUrls()
      setVideoUrls(urls)
      setIsLoading(false)
    }

    loadVideos()
  }, [])

  return { videoUrls, isLoading }
}

