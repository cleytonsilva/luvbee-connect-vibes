import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';
import { NeoButton } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/services/supabase';

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTakeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para a verificação.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets[0]) {
        setSelfieUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Erro ao capturar selfie:', err);
      Alert.alert('Erro', 'Não foi possível acessar a câmera.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selfieUri || !user?.id) return;

    setIsSubmitting(true);
    try {
      // Upload selfie para Supabase Storage
      const response = await fetch(selfieUri);
      const blob = await response.blob();
      const fileName = `${user.id}/verification/selfie_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // Salvar no banco
      const { error } = await supabase
        .from('identity_verifications')
        .insert({
          user_id: user.id,
          document_type: 'selfie',
          selfie_url: publicUrl,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert(
        'Selfie enviada! 🎉',
        'Sua foto foi enviada para análise. Você será notificado quando a verificação for concluída.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('Erro ao enviar:', err);
      Alert.alert('Erro', 'Não foi possível enviar sua selfie. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Verificação</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Icon Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={48} color={colors.blue} />
          </View>
          <Text style={styles.heroTitle}>Verifique seu perfil</Text>
          <Text style={styles.heroDescription}>
            Tire uma selfie para confirmar que você é uma pessoa real.{'\n'}
            Seu perfil receberá o selo de verificado ✓
          </Text>
        </View>

        {/* Selfie Area */}
        <TouchableOpacity
          style={[styles.selfieArea, selfieUri && styles.selfieAreaFilled]}
          onPress={handleTakeSelfie}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.blue} />
          ) : selfieUri ? (
            <>
              <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
              <View style={styles.retakeOverlay}>
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.retakeText}>Tirar novamente</Text>
              </View>
            </>
          ) : (
            <View style={styles.selfieEmpty}>
              <Ionicons name="camera-outline" size={48} color={colors.gray400} />
              <Text style={styles.selfieEmptyText}>Toque para tirar selfie</Text>
              <Text style={styles.selfieHint}>Use a câmera frontal</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.instructionText}>Rosto bem visível e iluminado</Text>
          </View>
          <View style={styles.instructionRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.instructionText}>Sem óculos escuros ou chapéu</Text>
          </View>
          <View style={styles.instructionRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.instructionText}>Olhe diretamente para a câmera</Text>
          </View>
        </View>

        {/* Submit */}
        {selfieUri && (
          <NeoButton
            title="Enviar para verificação"
            onPress={handleSubmit}
            loading={isSubmitting}
            color="green"
            size="lg"
          />
        )}

        {/* Security note */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={14} color={colors.gray400} />
          <Text style={styles.securityText}>
            Sua foto é criptografada e usada apenas para verificação
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 10,
    paddingBottom: spacing.md,
    backgroundColor: colors.blue,
    borderBottomWidth: 3,
    borderBottomColor: colors.black,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.black,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.blue + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  heroDescription: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  selfieArea: {
    aspectRatio: 1,
    width: '70%',
    alignSelf: 'center',
    borderRadius: 200,
    borderWidth: 3,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  selfieAreaFilled: {
    borderColor: colors.green,
    borderStyle: 'solid',
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  retakeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 4,
  },
  retakeText: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '600',
  },
  selfieEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  selfieEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray500,
  },
  selfieHint: {
    fontSize: 12,
    color: colors.gray400,
  },
  instructions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  instructionText: {
    fontSize: 14,
    color: colors.gray600,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  securityText: {
    fontSize: 12,
    color: colors.gray400,
  },
});
