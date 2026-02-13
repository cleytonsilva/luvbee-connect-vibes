// SwipeableCard.tsx - Card deslizável estilo Tinder com gestos e animações
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_ANGLE = 15;

interface SwipeableCardProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onTap?: () => void;
    enabled?: boolean;
}

export function SwipeableCard({
    children,
    onSwipeLeft,
    onSwipeRight,
    onTap,
    enabled = true,
}: SwipeableCardProps) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    const triggerHaptic = (type: 'like' | 'nope') => {
        if (type === 'like') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const handleSwipeComplete = (direction: 'left' | 'right') => {
        if (direction === 'right') {
            onSwipeRight?.();
        } else {
            onSwipeLeft?.();
        }
    };

    const panGesture = Gesture.Pan()
        .enabled(enabled)
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY * 0.5; // Reduz movimento vertical
        })
        .onEnd((event) => {
            const swipedRight = translateX.value > SWIPE_THRESHOLD;
            const swipedLeft = translateX.value < -SWIPE_THRESHOLD;

            if (swipedRight) {
                // Like! Voar para direita
                translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
                translateY.value = withTiming(event.translationY * 0.5, { duration: 300 });
                runOnJS(triggerHaptic)('like');
                runOnJS(handleSwipeComplete)('right');
            } else if (swipedLeft) {
                // Nope! Voar para esquerda
                translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
                translateY.value = withTiming(event.translationY * 0.5, { duration: 300 });
                runOnJS(triggerHaptic)('nope');
                runOnJS(handleSwipeComplete)('left');
            } else {
                // Voltar ao centro com spring
                translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
                translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
            }
        });

    const tapGesture = Gesture.Tap()
        .onStart(() => {
            scale.value = withTiming(0.97, { duration: 100 });
        })
        .onEnd(() => {
            scale.value = withSpring(1, { damping: 10, stiffness: 200 });
            if (onTap) {
                runOnJS(onTap)();
            }
        });

    const composedGesture = Gesture.Race(panGesture, tapGesture);

    // Animação do card principal
    const cardStyle = useAnimatedStyle(() => {
        const rotation = interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
            [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
            Extrapolation.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotation}deg` },
                { scale: scale.value },
            ],
        };
    });

    // Overlay "LIKE" (verde, aparece ao deslizar para direita)
    const likeOverlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD],
            [0, 0.5, 1],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    // Overlay "NOPE" (vermelho, aparece ao deslizar para esquerda)
    const nopeOverlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0],
            [1, 0.5, 0],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.container, cardStyle]}>
                {children}

                {/* LIKE overlay */}
                <Animated.View style={[styles.stampOverlay, styles.likeStamp, likeOverlayStyle]}>
                    <View style={styles.stampBorder}>
                        <Text style={styles.likeText}>CURTIR</Text>
                        <Text style={styles.stampEmoji}>💚</Text>
                    </View>
                </Animated.View>

                {/* NOPE overlay */}
                <Animated.View style={[styles.stampOverlay, styles.nopeStamp, nopeOverlayStyle]}>
                    <View style={[styles.stampBorder, styles.nopeBorder]}>
                        <Text style={styles.nopeText}>PASSAR</Text>
                        <Text style={styles.stampEmoji}>✕</Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
    },
    stampOverlay: {
        position: 'absolute',
        top: 40,
        zIndex: 10,
    },
    likeStamp: {
        left: 20,
        transform: [{ rotate: '-15deg' }],
    },
    nopeStamp: {
        right: 20,
        transform: [{ rotate: '15deg' }],
    },
    stampBorder: {
        borderWidth: 4,
        borderColor: colors.green,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0, 255, 148, 0.15)',
    },
    nopeBorder: {
        borderColor: colors.red,
        backgroundColor: 'rgba(255, 68, 68, 0.15)',
    },
    likeText: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.green,
        letterSpacing: 2,
    },
    nopeText: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.red,
        letterSpacing: 2,
    },
    stampEmoji: {
        fontSize: 28,
    },
});

export default SwipeableCard;
