import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../../src/constants/theme';
import { NeoButton, NeoInput } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    birthDate: '',
    gender: '',
  });

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Calcular idade
      const birthDate = new Date(form.birthDate);
      const age = Math.floor((Date.now() - birthDate.getTime()) / 31557600000);

      if (age < 18) {
        alert('Você deve ter pelo menos 18 anos');
        return;
      }

      await signUp(form.email, form.password, {
        name: form.name,
        birth_date: form.birthDate,
        age,
        gender: form.gender,
      });

      router.replace('/(tabs)/discover');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>

      <NeoInput
        label="Nome"
        placeholder="Seu nome"
        value={form.name}
        onChangeText={(text) => setForm({ ...form, name: text })}
      />

      <NeoInput
        label="Email"
        placeholder="seu@email.com"
        value={form.email}
        onChangeText={(text) => setForm({ ...form, email: text })}
        keyboardType="email-address"
      />

      <NeoInput
        label="Senha"
        placeholder="Mínimo 6 caracteres"
        value={form.password}
        onChangeText={(text) => setForm({ ...form, password: text })}
        secureTextEntry
      />

      <NeoInput
        label="Data de Nascimento"
        placeholder="DD/MM/AAAA"
        value={form.birthDate}
        onChangeText={(text) => setForm({ ...form, birthDate: text })}
      />

      <NeoButton
        title="Continuar"
        onPress={handleRegister}
        loading={loading}
        size="lg"
        color="pink"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.pink,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
