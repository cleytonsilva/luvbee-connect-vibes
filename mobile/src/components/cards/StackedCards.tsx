import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    withSpring
} from 'react-native-reanimated';
import { SwipeableCard } from './SwipeableCard';

const { width } = Dimensions.get('window');

interface StackedCardsProps {
    data: any[];
    currentIndex: number;
    onLike: () => void;
    onPass: () => void;
    onTap: () => void;
    actionLoading: boolean;
    renderTopCard: (item: any) => React.ReactNode;
    renderBackgroundCard: (item: any) => React.ReactNode;
    stackDepth?: number;
}

export function StackedCards({
    data,
    currentIndex,
    onLike,
    onPass,
    onTap,
    actionLoading,
    renderTopCard,
    renderBackgroundCard,
    stackDepth = 3
}: StackedCardsProps) {

    const currentItem = data[currentIndex];

    // Renderiza até `stackDepth` cards para trás
    const backgroundItems = data.slice(currentIndex + 1, currentIndex + stackDepth);

    if (!currentItem) return null;

    return (
        <View style={styles.container}>
            {/* Reverse the array to render the deepest cards first (lowest zIndex) */}
            {backgroundItems.reverse().map((item, index) => {
                // Since we reversed it, the nearest card to the top has index = length - 1
                const actualDepth = backgroundItems.length - index;

                // Estilo simulando a pilha: diminui a escala e empurra pra baixo/cima
                // O card mais próximo: depth 1
                // O card ais distante: depth 2
                const scale = 1 - (actualDepth * 0.05);
                const translateY = actualDepth * 15;

                return (
                    <Animated.View
                        key={`bg-${actualDepth}-${item.id || index}`}
                        style={[
                            styles.backgroundCard,
                            { transform: [{ scale }, { translateY }] }
                        ]}
                        pointerEvents="none"
                    >
                        {renderBackgroundCard(item)}
                    </Animated.View>
                );
            })}

            {/* Card do Topo Principal com Swipe */}
            <SwipeableCard
                key={`top-${currentIndex}-${currentItem.id}`}
                onSwipeRight={onLike}
                onSwipeLeft={onPass}
                onTap={onTap}
                enabled={!actionLoading}
            >
                {renderTopCard(currentItem)}
            </SwipeableCard>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backgroundCard: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
        // Estilo Neo-brutalista de sombreamento caso queiram separar a pilha
    }
});
