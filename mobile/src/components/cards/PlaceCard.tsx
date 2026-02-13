// PlaceCard.tsx - Card de lugar com carregamento de imagem do Google Places
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';
import { LocationWithStats } from '../../services/locationService';
import { getPlaceImageUrl } from '../../services/imageCache';
import { getDeterministicImage } from '../../services/images';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface PlaceCardProps {
    place: LocationWithStats & {
        photoReference?: string;
        photos?: Array<{ photo_reference?: string; name?: string }>;
    };
    showFullDetails?: boolean;
}

/**
 * PlaceCard - Componente de card de lugar com carregamento dinâmico de imagem
 * 
 * Fluxo de imagem:
 * 1. Mostra placeholder determinístico baseado na categoria
 * 2. Em background, busca imagem real do Google via Edge Function
 * 3. Atualiza quando a imagem real está disponível
 */
export function PlaceCard({ place, showFullDetails = true }: PlaceCardProps) {
    // Estado para a imagem (começa com placeholder)
    const [imageUrl, setImageUrl] = useState<string>(() => {
        const category = place.category || place.type || 'default';
        return getDeterministicImage(place.id || place.google_place_id || 'default', category);
    });
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Carrega imagem real do Google em background
    useEffect(() => {
        const loadRealImage = async () => {
            // Determina o photo_reference
            let photoRef: string | null = null;

            if (place.photoReference) {
                photoRef = place.photoReference;
            } else if (place.photos && place.photos.length > 0) {
                photoRef = place.photos[0].photo_reference || place.photos[0].name || null;
            }

            // Se não há photo reference, mantém placeholder
            if (!photoRef || !place.id) {
                return;
            }

            setIsLoadingImage(true);

            try {
                const cachedUrl = await getPlaceImageUrl(place.id, photoRef, 600);

                if (cachedUrl) {
                    setImageUrl(cachedUrl);
                }
            } catch (error) {
                console.error('❌ Erro ao carregar imagem:', error);
                setImageError(true);
            } finally {
                setIsLoadingImage(false);
            }
        };

        loadRealImage();
    }, [place.id, place.photoReference, place.photos]);

    // Dados formatados
    const categoryText = place.category || place.type || 'Local';
    const distanceText = place.distance || '~1 km';
    const ratingText = place.rating ? parseFloat(place.rating).toFixed(1) : null;
    const peopleCount = place.peopleCount || 0;

    return (
        <View style={styles.card}>
            {/* Imagem com loading indicator */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={300}
                    onError={() => setImageError(true)}
                />

                {/* Loading overlay enquanto carrega imagem real */}
                {isLoadingImage && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color={colors.yellow} />
                    </View>
                )}
            </View>

            {/* Overlay com informações */}
            <View style={styles.cardOverlay}>
                {/* Badge de categoria */}
                <View style={styles.cardBadge}>
                    <Text style={styles.badgeText}>{categoryText}</Text>
                </View>

                {/* Conteúdo */}
                <View style={styles.cardContent}>
                    <Text style={styles.placeName} numberOfLines={2}>
                        {place.name}
                    </Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="location" size={16} color={colors.white} />
                            <Text style={styles.infoText}>{distanceText}</Text>
                        </View>

                        {ratingText && (
                            <View style={styles.infoItem}>
                                <Ionicons name="star" size={16} color={colors.yellow} />
                                <Text style={styles.infoText}>{ratingText}</Text>
                            </View>
                        )}

                        <View style={styles.infoItem}>
                            <Ionicons name="people" size={16} color={colors.white} />
                            <Text style={styles.infoText}>{peopleCount} pessoas</Text>
                        </View>
                    </View>

                    <View style={styles.vibeContainer}>
                        <Text style={styles.vibeLabel}>Vibe:</Text>
                        <Text style={styles.vibeText}>{place.vibe || 'Interessante'}</Text>
                    </View>

                    {showFullDetails && place.address && (
                        <Text style={styles.addressText} numberOfLines={1}>
                            📍 {place.address}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.3,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: colors.black,
        backgroundColor: colors.white,
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 8,
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    cardBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.yellow,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.black,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.black,
    },
    cardContent: {
        backgroundColor: 'rgba(0,0,0,0.75)',
        padding: spacing.md,
        borderRadius: 16,
    },
    placeName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.sm,
        flexWrap: 'wrap',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 14,
        color: colors.white,
    },
    vibeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    vibeLabel: {
        fontSize: 12,
        color: colors.gray300,
    },
    vibeText: {
        fontSize: 14,
        color: colors.yellow,
        fontWeight: '600',
    },
    addressText: {
        fontSize: 11,
        color: colors.gray300,
        marginTop: 4,
    },
});

export default PlaceCard;
