// images.ts - Serviço de imagens alternativo sem depender do Google Places API

// ===========================================
// IMAGENS DE PLACEHOLDER POR CATEGORIA
// ===========================================

const CATEGORY_IMAGES: Record<string, string[]> = {
  bar: [
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800',
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800',
    'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=800',
  ],
  nightclub: [
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800',
    'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800',
    'https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=800',
    'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
  ],
  museum: [
    'https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=800',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800',
    'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=800',
    'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800',
  ],
  theater: [
    'https://images.unsplash.com/photo-1503095392237-fc55088350b9?w=800',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7f8a?w=800',
    'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  ],
  art_gallery: [
    'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800',
    'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800',
    'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=800',
    'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800',
  ],
  live_music: [
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
    'https://images.unsplash.com/photo-1459749411177-0473ef716175?w=800',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=800',
  ],
  comedy_club: [
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7f8a?w=800',
  ],
  park: [
    'https://images.unsplash.com/photo-1496564203457-11bb12075d90?w=800',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  ],
  shopping: [
    'https://images.unsplash.com/photo-1567449303078-57ad995bd311?w=800',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
  ],
  default: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ],
};

// ===========================================
// FUNÇÃO PARA OBTER IMAGEM ALEATÓRIA POR CATEGORIA
// ===========================================

export function getPlaceholderImage(category?: string): string {
  const normalizedCategory = category?.toLowerCase().replace(/\s+/g, '_') || 'default';
  
  // Procura por match exato
  if (CATEGORY_IMAGES[normalizedCategory]) {
    const images = CATEGORY_IMAGES[normalizedCategory];
    return images[Math.floor(Math.random() * images.length)];
  }
  
  // Procura por match parcial
  for (const [key, images] of Object.entries(CATEGORY_IMAGES)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return images[Math.floor(Math.random() * images.length)];
    }
  }
  
  // Retorna default
  const defaultImages = CATEGORY_IMAGES.default;
  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}

// ===========================================
// FUNÇÃO PARA OBTER IMAGEM DETERMINÍSTICA (mesmo lugar = mesma imagem)
// ===========================================

export function getDeterministicImage(placeId: string, category?: string): string {
  const normalizedCategory = category?.toLowerCase().replace(/\s+/g, '_') || 'default';
  const images = CATEGORY_IMAGES[normalizedCategory] || CATEGORY_IMAGES.default;
  
  // Usa o placeId para gerar um índice consistente
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) {
    const char = placeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para 32bit integer
  }
  
  const index = Math.abs(hash) % images.length;
  return images[index];
}

// ===========================================
// FUNÇÃO PARA OBTER MÚLTIPLAS IMAGENS (para galeria)
// ===========================================

export function getGalleryImages(category?: string): string[] {
  const normalizedCategory = category?.toLowerCase().replace(/\s+/g, '_') || 'default';
  
  if (CATEGORY_IMAGES[normalizedCategory]) {
    return CATEGORY_IMAGES[normalizedCategory];
  }
  
  // Procura por match parcial
  for (const [key, images] of Object.entries(CATEGORY_IMAGES)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return images;
    }
  }
  
  return CATEGORY_IMAGES.default;
}

export default {
  getPlaceholderImage,
  getDeterministicImage,
  getGalleryImages,
};
