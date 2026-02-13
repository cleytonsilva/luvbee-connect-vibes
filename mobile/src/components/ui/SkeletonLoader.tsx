// SkeletonLoader.tsx - Esqueleto animado para loading states
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

function SkeletonBox({ width = '100%', height = 20, borderRadius: br = 8, style }: SkeletonProps) {
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmerValue.value, [0, 1], [0.3, 0.7]),
    }));

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius: br,
                    backgroundColor: colors.gray300,
                },
                animatedStyle,
                style,
            ]}
        />
    );
}

// Skeleton para o card de lugar (Discover)
export function PlaceCardSkeleton() {
    const cardWidth = SCREEN_WIDTH - 40;

    return (
        <View style={[skeletonStyles.card, { width: cardWidth, height: cardWidth * 1.3 }]}>
            <SkeletonBox width="100%" height={cardWidth * 1.3} borderRadius={20} />
            <View style={skeletonStyles.cardOverlay}>
                <SkeletonBox width={80} height={28} borderRadius={14} />
                <View style={skeletonStyles.cardContent}>
                    <SkeletonBox width="70%" height={24} borderRadius={6} />
                    <View style={skeletonStyles.row}>
                        <SkeletonBox width={60} height={16} borderRadius={4} />
                        <SkeletonBox width={40} height={16} borderRadius={4} />
                        <SkeletonBox width={80} height={16} borderRadius={4} />
                    </View>
                    <SkeletonBox width="50%" height={16} borderRadius={4} />
                </View>
            </View>
        </View>
    );
}

// Skeleton para o card de lista (Places)
export function PlaceListCardSkeleton() {
    return (
        <View style={skeletonStyles.listCard}>
            <SkeletonBox width={80} height={80} borderRadius={12} />
            <View style={skeletonStyles.listInfo}>
                <SkeletonBox width="60%" height={18} borderRadius={4} />
                <View style={[skeletonStyles.row, { marginTop: 8 }]}>
                    <SkeletonBox width={50} height={14} borderRadius={4} />
                    <SkeletonBox width={35} height={14} borderRadius={4} />
                </View>
                <SkeletonBox width="40%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
        </View>
    );
}

// Skeleton para avatar circular (Matches)
export function AvatarSkeleton({ size = 56 }: { size?: number }) {
    return <SkeletonBox width={size} height={size} borderRadius={size / 2} />;
}

// Skeleton para item de chat
export function ChatItemSkeleton() {
    return (
        <View style={skeletonStyles.chatItem}>
            <AvatarSkeleton />
            <View style={skeletonStyles.chatInfo}>
                <SkeletonBox width="50%" height={16} borderRadius={4} />
                <SkeletonBox width="80%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
        </View>
    );
}

// Lista de skeletons
export function SkeletonList({ count = 5, type = 'list' }: { count?: number; type?: 'list' | 'chat' }) {
    const Component = type === 'chat' ? ChatItemSkeleton : PlaceListCardSkeleton;
    return (
        <View style={skeletonStyles.container}>
            {Array.from({ length: count }).map((_, i) => (
                <Component key={i} />
            ))}
        </View>
    );
}

const skeletonStyles = StyleSheet.create({
    container: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    cardContent: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: spacing.md,
        borderRadius: 16,
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    listCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.gray200,
        padding: spacing.sm,
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    listInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    chatInfo: {
        flex: 1,
    },
});

export { SkeletonBox };
export default PlaceCardSkeleton;
