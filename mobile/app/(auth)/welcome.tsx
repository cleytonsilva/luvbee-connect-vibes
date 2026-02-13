import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../src/constants/theme';
import { NeoButton } from '../../src/components/ui/NeoButton';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>💕</Text>
        <Text style={styles.title}>Luvbee</Text>
        <Text style={styles.subtitle}>Conecte-se pelos lugares</Text>

        <Text style={styles.description}>
          Encontre pessoas incríveis que frequentam os mesmos lugares que você
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="location" size={24} color={colors.black} />
            <Text style={styles.featureText}>Descubra lugares</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color={colors.black} />
            <Text style={styles.featureText}>Match por afinidade</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="chatbubbles" size={24} color={colors.black} />
            <Text style={styles.featureText}>Converse e combine</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        <NeoButton
          title="Criar Conta"
          onPress={() => router.push('/(auth)/register')}
          size="lg"
          color="yellow"
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginText}>
            Já tem conta? <Text style={styles.loginLink}>Entrar</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tourButton}
          onPress={() => router.push('/onboarding')}
        >
          <Text style={styles.tourText}>
            <Ionicons name="information-circle" size={16} /> Ver tour novamente
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    padding: 20,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: colors.gray700,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: 300,
  },
  buttons: {
    gap: 12,
    paddingBottom: 40,
  },
  loginButton: {
    alignItems: 'center',
    padding: 12,
  },
  loginText: {
    fontSize: 16,
    color: colors.black,
  },
  loginLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  features: {
    marginTop: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 16,
    color: colors.black,
    fontWeight: '500',
  },
  tourButton: {
    alignItems: 'center',
    padding: 8,
  },
  tourText: {
    fontSize: 14,
    color: colors.gray600,
  },
});
