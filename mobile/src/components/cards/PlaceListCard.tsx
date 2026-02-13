// PlaceListCard.tsx - Card de lugar para lista com carregamento de imagem do Google Places
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { LocationWithStats } from '../../services/locationService';
import { getPlaceImageUrl } from '../../services/imageCache';
import { getDeterministicImage } from '../../services/images';

interface PlaceListCardProps {
    place: LocationWithStats & {
        photos?: Array<{ photo_reference?: string; name?: string }>;
    };
    onPress?: () => void;
    onLongPress?: () => void;
}

/**
 * PlaceListCard - Componente de card para lista com carregamento dinâmico de imagem
 * 
 * Usado em listas de lugares (Meus Lugares, etc.)
 */
export function PlaceListCard({ place, onPress, onLongPress }: PlaceListCardProps) {
    const [imageUrl, setImageUrl] = useState<string>(() => {
        // Priorizar tipo técnico para imagens, categoria para display
        const imgCategory = place.type || place.category || 'default';
        return place.image_url || getDeterministicImage(place.id || 'default', imgCategory);
    });
    const [isLoadingImage, setIsLoadingImage] = useState(false);

    // Carrega imagem real do Google em background
    useEffect(() => {
        const loadRealImage = async () => {
            let photoRef: string | null = null;

            if (place.photos && place.photos.length > 0) {
                photoRef = place.photos[0].photo_reference || place.photos[0].name || null;
            }

            if (!photoRef || !place.id) {
                return;
            }

            setIsLoadingImage(true);

            try {
                const cachedUrl = await getPlaceImageUrl(place.id, photoRef, 400);

                if (cachedUrl) {
                    setImageUrl(cachedUrl);
                }
            } catch (error) {
                console.error('❌ Erro ao carregar imagem:', error);
            } finally {
                setIsLoadingImage(false);
            }
        };

        loadRealImage();
    }, [place.id, place.photos]);

    const matchCount = place.matchCount ?? 0;
    const categoryText = place.category || place.type || 'Local';
    const distanceText = place.distance || '~1 km';

    return (
        <TouchableOpacity
            style={styles.placeCard}
            activeOpacity={0.7}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.placeImage}
                    contentFit="cover"
                    transition={200}
                />
                {isLoadingImage && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color={colors.yellow} />
                    </View>
                )}
            </View>

            <View style={styles.placeInfo}>
                <View style={styles.placeHeader}>
                    <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{categoryText}</Text>
                    </View>
                </View>

                <View style={styles.placeDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color={colors.gray500} />
                        <Text style={styles.detailText}>{distanceText}</Text>
                    </View>
                    {place.rating ? (
                        <View style={styles.detailItem}>
                            <Ionicons name="star" size={14} color={colors.yellow} />
                            <Text style={styles.detailText}>{parseFloat(place.rating).toFixed(1)}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.matchInfo}>
                    <Ionicons name="heart" size={14} color={colors.pink} />
                    <Text style={styles.matchText}>
                        {matchCount === 0 ? 'Seja o primeiro!' : `${matchCount} pessoa${matchCount > 1 ? 's' : ''} também ${matchCount > 1 ? 'curtiram' : 'curtiu'}`}
                    </Text>
                </View>

                {place.likedAt ? (
                    <Text style={styles.likedAt}>Curtido {place.likedAt}</Text>
                ) : null}
            </View>

            <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    placeCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.black,
        overflow: 'hidden',
        alignItems: 'center',
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.black,
        position: 'relative',
    },
    placeImage: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    placeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: 4,
    },
    placeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.black,
        flex: 1,
    },
    categoryBadge: {
        backgroundColor: colors.yellow,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.black,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.black,
    },
    placeDetails: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: 4,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 12,
        color: colors.gray600,
    },
    matchInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    matchText: {
        fontSize: 12,
        color: colors.pink,
        fontWeight: '500',
    },
    likedAt: {
        fontSize: 10,
        color: colors.gray400,
    },
    chevronContainer: {
        padding: spacing.xs,
    },
});

export default PlaceListCard;
