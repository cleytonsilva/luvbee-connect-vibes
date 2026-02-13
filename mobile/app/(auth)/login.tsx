import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../src/constants/theme';
import { NeoButton } from '../../src/components/ui/NeoButton';
import { NeoInput } from '../../src/components/ui/NeoInput';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { checkSupabaseConnection } from '../../src/services/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    console.log(`🔐 Tentando login para: ${email.trim().toLowerCase()}`);

    try {
      await signIn(email.trim().toLowerCase(), password);
      console.log('✅ Login realizado com sucesso');
      router.replace('/(tabs)/discover');
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      let errorMessage = err.message || 'Email ou senha incorretos';

      // Diagnóstico aprimorado de erro
      if (err.message?.includes('fetch') || err.message?.includes('network') || !err.message) {
        console.log('📡 Detectado possível erro de rede, verificando conexão...');
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          errorMessage = 'Erro de conexão com o servidor. Verifique sua internet e configurações.';
        } else {
          errorMessage = 'Erro ao conectar. Tente novamente.';
        }
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>💕</Text>
          <Text style={styles.title}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitle}>Entre na sua conta Luvbee</Text>
        </View>

        <View style={styles.form}>
          <NeoInput
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
          />

          <NeoInput
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon="lock-closed-outline"
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <NeoButton
            title={loading ? "Entrando..." : "Entrar"}
            onPress={handleLogin}
            loading={loading}
            size="lg"
            color="yellow"
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Não tem conta?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/register')}
            >
              Criar conta
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.white,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.black,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray500,
  },
  form: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    flex: 1,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.gray600,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.gray600,
  },
  footerLink: {
    fontWeight: 'bold',
    color: colors.black,
    textDecorationLine: 'underline',
  },
});
