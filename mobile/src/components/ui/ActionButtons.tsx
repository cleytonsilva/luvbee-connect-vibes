// ActionButtons.tsx - Botões de ação com animações e feedback háptico
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../../constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ActionButtonsProps {
    onLike: () => void;
    onPass: () => void;
    onDetails?: () => void;
    disabled?: boolean;
}

export function ActionButtons({ onLike, onPass, onDetails, disabled = false }: ActionButtonsProps) {
    const likeScale = useSharedValue(1);
    const passScale = useSharedValue(1);
    const detailsScale = useSharedValue(1);

    const handleLike = async () => {
        if (disabled) return;
        likeScale.value = withSequence(
            withTiming(0.93, { duration: 80 }),
            withSpring(1, { damping: 12, stiffness: 200 })
        );
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLike();
    };

    const handlePass = async () => {
        if (disabled) return;
        passScale.value = withSequence(
            withTiming(0.93, { duration: 80 }),
            withSpring(1, { damping: 12, stiffness: 200 })
        );
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPass();
    };

    const handleDetails = async () => {
        if (disabled) return;
        detailsScale.value = withSequence(
            withTiming(0.9, { duration: 80 }),
            withSpring(1, { damping: 10, stiffness: 200 })
        );
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDetails?.();
    };

    const likeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    const passStyle = useAnimatedStyle(() => ({
        transform: [{ scale: passScale.value }],
    }));

    const detailsStyle = useAnimatedStyle(() => ({
        transform: [{ scale: detailsScale.value }],
    }));

    return (
        <View style={styles.container}>
            {/* Botão PASS (X) */}
            <AnimatedTouchable
                style={[styles.button, styles.passButton, passStyle]}
                activeOpacity={0.8}
                onPress={handlePass}
                disabled={disabled}
            >
                <Ionicons name="close" size={32} color={colors.red} />
            </AnimatedTouchable>

            {/* Botão DETALHES (i) */}
            {onDetails && (
                <AnimatedTouchable
                    style={[styles.button, styles.detailsButton, detailsStyle]}
                    activeOpacity={0.8}
                    onPress={handleDetails}
                    disabled={disabled}
                >
                    <Ionicons name="information-circle" size={24} color={colors.blue} />
                </AnimatedTouchable>
            )}

            {/* Botão LIKE (coração) */}
            <AnimatedTouchable
                style={[styles.button, styles.likeButton, likeStyle]}
                activeOpacity={0.8}
                onPress={handleLike}
                disabled={disabled}
            >
                <Ionicons name="heart" size={32} color={colors.green} />
            </AnimatedTouchable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.lg,
        paddingVertical: spacing.md,
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderWidth: 3,
        borderColor: colors.black,
        ...shadows.md,
    },
    passButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    detailsButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    likeButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
});

export default ActionButtons;
