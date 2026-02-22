import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.75;
const ITEM_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

interface TiltCarouselProps {
    data: any[];
    onLike: (item: any) => void;
    onPass: (item: any) => void;
    onPressItem: (item: any) => void;
}

export function TiltCarousel({ data, onLike, onPass, onPressItem }: TiltCarouselProps) {
    const scrollX = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const TiltCard = ({ item, index }: { item: any; index: number }) => {
        const animatedStyle = useAnimatedStyle(() => {
            const inputRange = [
                (index - 1) * ITEM_WIDTH,
                index * ITEM_WIDTH,
                (index + 1) * ITEM_WIDTH,
            ];

            const rotateZ = interpolate(
                scrollX.value,
                inputRange,
                [5, 0, -5],
                Extrapolation.CLAMP
            );

            const translateY = interpolate(
                scrollX.value,
                inputRange,
                [20, 0, 20],
                Extrapolation.CLAMP
            );

            const scale = interpolate(
                scrollX.value,
                inputRange,
                [0.9, 1, 0.9],
                Extrapolation.CLAMP
            );

            return {
                transform: [
                    { translateY },
                    { rotateZ: `${rotateZ}deg` },
                    { scale },
                ],
            };
        });

        return (
            <Animated.View style={[styles.cardContainer, animatedStyle]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onPressItem(item)}
                    style={styles.card}
                >
                    {/* Imagem */}
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: item.photo }}
                            style={styles.image}
                            contentFit="cover"
                        />
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{item.compatibility}%</Text>
                        </View>
                        {item.isOnline && <View style={styles.onlineDot} />}
                    </View>

                    {/* Info Seca Neo-Brutalista */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>

                        <View style={styles.commonRow}>
                            <Ionicons name="location" size={14} color={colors.pink} />
                            <Text style={styles.commonText}>
                                {item.commonPlacesCount} lugares em comum
                            </Text>
                        </View>

                        <View style={styles.vibesContainer}>
                            {item.vibes?.slice(0, 2).map((vibe: string, vIndex: number) => (
                                <View key={vIndex} style={styles.vibeBadge}>
                                    <Text style={styles.vibeText}>{vibe}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Ações dentro do card (além da scroll view) */}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.buttonPass]}
                                onPress={() => onPass(item)}
                            >
                                <Ionicons name="close" size={24} color={colors.white} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.buttonLike]}
                                onPress={() => onLike(item)}
                            >
                                <Ionicons name="heart" size={24} color={colors.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{
                paddingHorizontal: ITEM_SPACING,
                alignItems: 'center'
            }}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
        >
            {data.map((item, index) => (
                <TiltCard key={item.id} item={item} index={index} />
            ))}
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        width: ITEM_WIDTH,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: colors.black,
        // Neo-brutalist hard shadow
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
        overflow: 'hidden',
        height: SCREEN_WIDTH * 1.1,
    },
    imageWrapper: {
        height: '50%',
        width: '100%',
        borderBottomWidth: 3,
        borderBottomColor: colors.black,
        position: 'relative',
        backgroundColor: colors.gray100,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    badgeContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: colors.yellow,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.black,
    },
    badgeText: {
        fontWeight: '900',
        fontSize: 16,
        color: colors.black,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.green,
        borderWidth: 2,
        borderColor: colors.black,
    },
    infoContainer: {
        padding: spacing.md,
        flex: 1,
        justifyContent: 'space-between',
    },
    nameText: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.black,
        marginBottom: 4,
    },
    commonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    commonText: {
        fontSize: 14,
        color: colors.pink,
        marginLeft: 6,
        fontWeight: 'bold',
    },
    vibesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    vibeBadge: {
        backgroundColor: colors.blue,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.black,
    },
    vibeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.black,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    actionButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.black,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    buttonPass: {
        backgroundColor: colors.red,
    },
    buttonLike: {
        backgroundColor: colors.green,
    },
});
