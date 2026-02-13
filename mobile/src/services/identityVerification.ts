// Sistema de Verificação de Idade e Identidade

import * as ImagePicker from 'expo-image-picker';

export interface VerificationStatus {
  isAgeVerified: boolean;
  isIdentityVerified: boolean;
  isPhotoVerified: boolean;
  verificationLevel: 'none' | 'basic' | 'full';
  pendingDocuments: string[];
}

export class IdentityVerificationService {
  // Verificar idade baseada na data de nascimento
  static calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  static isAdult(birthDate: string): boolean {
    return this.calculateAge(birthDate) >= 18;
  }

  // Solicitar verificação de documento
  static async requestDocumentVerification(
    documentType: 'rg' | 'cnh' | 'passport'
  ): Promise<{ front?: string; back?: string; selfie?: string } | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        alert('Precisamos de permissão para acessar a câmera');
        return null;
      }

      // Foto da frente do documento
      alert('Tire uma foto da FRENTE do seu documento');
      const frontResult = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (frontResult.canceled) return null;
      const front = frontResult.assets[0].uri;

      // Foto do verso (exceto passaporte)
      let back: string | undefined;
      if (documentType !== 'passport') {
        alert('Agora tire uma foto do VERSO do documento');
        const backResult = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.9,
        });

        if (!backResult.canceled) {
          back = backResult.assets[0].uri;
        }
      }

      // Selfie para verificação
      alert('Agora tire uma selfie segurando o documento ao lado do rosto');
      const selfieResult = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        cameraType: ImagePicker.CameraType.front,
      });

      if (selfieResult.canceled) return null;
      const selfie = selfieResult.assets[0].uri;

      return { front, back, selfie };
    } catch (error) {
      console.error('Erro na verificação:', error);
      return null;
    }
  }

  // Upload dos documentos para análise
  static async uploadVerificationDocuments(
    userId: string,
    documents: { front?: string; back?: string; selfie?: string },
    documentType: 'rg' | 'cnh' | 'passport'
  ): Promise<boolean> {
    try {
      const uploadPromises = [];

      if (documents.front) {
        uploadPromises.push(this.uploadDocument(userId, documents.front, 'front'));
      }
      if (documents.back) {
        uploadPromises.push(this.uploadDocument(userId, documents.back, 'back'));
      }
      if (documents.selfie) {
        uploadPromises.push(this.uploadDocument(userId, documents.selfie, 'selfie'));
      }

      const urls = await Promise.all(uploadPromises);

      // Salvar no banco de dados
      const { error } = await supabase
        .from('identity_verifications')
        .insert([{
          user_id: userId,
          document_type: documentType,
          document_front_url: urls[0],
          document_back_url: urls[1] || null,
          selfie_url: urls[urls.length - 1],
          status: 'pending',
        }]);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro no upload:', error);
      return false;
    }
  }

  private static async uploadDocument(
    userId: string,
    uri: string,
    type: string
  ): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `${userId}/verification/${type}_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: signedData, error: signError } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 ano de validade para o link

    if (signError) throw signError;

    return signedData.signedUrl;
  }

  // Verificar status da verificação
  static async checkVerificationStatus(userId: string): Promise<VerificationStatus> {
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('birth_date')
        .eq('id', userId)
        .single();

      const isAgeVerified = profile?.birth_date
        ? this.isAdult(profile.birth_date)
        : false;

      const isIdentityVerified = !!data;

      let verificationLevel: 'none' | 'basic' | 'full' = 'none';
      if (isAgeVerified) verificationLevel = 'basic';
      if (isAgeVerified && isIdentityVerified) verificationLevel = 'full';

      return {
        isAgeVerified,
        isIdentityVerified,
        isPhotoVerified: false, // Implementar verificação de foto ao vivo
        verificationLevel,
        pendingDocuments: isIdentityVerified ? [] : ['identity_document'],
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return {
        isAgeVerified: false,
        isIdentityVerified: false,
        isPhotoVerified: false,
        verificationLevel: 'none',
        pendingDocuments: ['identity_document'],
      };
    }
  }
}

import { supabase } from './supabase';
