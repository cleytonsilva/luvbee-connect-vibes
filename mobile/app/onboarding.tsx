import React, { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  TouchableOpacity,
  Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, shadows } from '../src/constants/theme';
import { NeoButton } from '../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    icon: '💕',
    title: 'Bem-vindo ao Luvbee',
    description: 'O app de relacionamentos que conecta pessoas através dos lugares que elas frequentam.',
    color: colors.yellow,
  },
  {
    id: '2',
    icon: '📍',
    title: 'Descubra Lugares',
    description: 'Encontre bares, restaurantes, museus e eventos próximos a você. Veja quem frequenta cada lugar!',
    color: colors.blue,
  },
  {
    id: '3',
    icon: '👆',
    title: 'Swipe & Match',
    description: 'Deslize para a direita para curtir, esquerda para passar. Se ambos curtirem, é match!',
    color: colors.pink,
  },
  {
    id: '4',
    icon: '💬',
    title: 'Converse',
    description: 'Quando der match, comece a conversar e marque um encontro no lugar que vocês têm em comum!',
    color: colors.green,
  },
  {
    id: '5',
    icon: '🔒',
    title: 'Segurança Primeiro',
    description: 'Verificamos a idade e identidade de todos os usuários. Fotos são moderadas por IA para sua segurança.',
    color: colors.purple,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finish onboarding - save flag
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.push('/welcome');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.push('/welcome');
  };

  const renderItem = ({ item, index }: { item: typeof ONBOARDING_DATA[0]; index: number }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.color }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {ONBOARDING_DATA.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Pular</Text>
      </TouchableOpacity>

      {/* Onboarding Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Progress Dots */}
      {renderDots()}

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <NeoButton
          title={currentIndex === ONBOARDING_DATA.length - 1 ? "Começar" : "Próximo"}
          onPress={handleNext}
          size="lg"
          color="yellow"
        />
        
        {currentIndex < ONBOARDING_DATA.length - 1 && (
          <TouchableOpacity style={styles.skipBottomButton} onPress={handleSkip}>
            <Text style={styles.skipBottomText}>Pular tour</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: colors.black,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  slide: {
    width: width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: colors.black,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 100,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 18,
    color: colors.gray800,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 320,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gray300,
    borderWidth: 2,
    borderColor: colors.black,
  },
  dotActive: {
    backgroundColor: colors.black,
    width: 24,
  },
  bottomContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  skipBottomButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  skipBottomText: {
    fontSize: 14,
    color: colors.gray500,
    textDecorationLine: 'underline',
  },
});
