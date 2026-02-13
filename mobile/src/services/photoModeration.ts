// Sistema de Moderação de Fotos - Anti-nudes/Anti-inapropriado

import * as ImagePicker from 'expo-image-picker';

interface ModerationResult {
  isApproved: boolean;
  hasNudity: boolean;
  isInappropriate: boolean;
  confidence: number;
  reasons: string[];
}

export class PhotoModerationService {
  // Palavras-chave para detectar conteúdo inapropriado nos metadados
  private static inappropriateKeywords = [
    'nude', 'naked', 'sex', 'porn', 'xxx', 'adult', 'explicit',
    'nua', 'pelada', 'sexo', 'pornô', 'erótico', 'explícito'
  ];

  // Verifica se a imagem pode ser inapropriada baseada em metadados/nome
  static async checkImageMetadata(imageUri: string): Promise<boolean> {
    try {
      // Extrair nome do arquivo
      const fileName = imageUri.split('/').pop()?.toLowerCase() || '';
      
      // Verificar palavras-chave inapropriadas no nome
      for (const keyword of this.inappropriateKeywords) {
        if (fileName.includes(keyword)) {
          console.warn('Imagem com nome suspeito:', fileName);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar metadados:', error);
      return false;
    }
  }

  // Análise básica da imagem (simulação - em produção usar TensorFlow.js ou API)
  static async analyzeImage(imageUri: string): Promise<ModerationResult> {
    try {
      // Verificação de metadados primeiro
      const metadataOk = await this.checkImageMetadata(imageUri);
      
      if (!metadataOk) {
        return {
          isApproved: false,
          hasNudity: true,
          isInappropriate: true,
          confidence: 0.9,
          reasons: ['Nome do arquivo contém conteúdo suspeito']
        };
      }

      // Em produção, aqui integraríamos com:
      // 1. TensorFlow.js com modelo de detecção de nudez
      // 2. API do Google Vision AI
      // 3. AWS Rekognition
      // 4. Ou serviço próprio de moderação

      // Simulação de aprovação
      return {
        isApproved: true,
        hasNudity: false,
        isInappropriate: false,
        confidence: 0.95,
        reasons: []
      };
    } catch (error) {
      console.error('Erro na análise da imagem:', error);
      return {
        isApproved: false,
        hasNudity: false,
        isInappropriate: false,
        confidence: 0,
        reasons: ['Erro ao processar imagem']
      };
    }
  }

  // Selecionar imagem da galeria com moderação
  static async pickImage(): Promise<{ uri: string; moderation: ModerationResult } | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const moderation = await this.analyzeImage(uri);
        
        return { uri, moderation };
      }

      return null;
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      return null;
    }
  }

  // Tirar foto com moderação
  static async takePhoto(): Promise<{ uri: string; moderation: ModerationResult } | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Precisamos de permissão para acessar a câmera');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const moderation = await this.analyzeImage(uri);
        
        return { uri, moderation };
      }

      return null;
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      return null;
    }
  }

  // Upload da foto para o Supabase Storage
  static async uploadPhoto(uri: string, userId: string): Promise<string | null> {
    try {
      // Converter URI para blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileName = `${userId}/${Date.now()}.jpg`;
      
      // Upload para o Supabase
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // Retornar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      return null;
    }
  }
}

// Import necessário
import { supabase } from './supabase';
