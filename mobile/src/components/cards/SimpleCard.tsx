import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../../constants/theme';
import { NeoButton } from '../ui/NeoButton';
import { Profile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SimpleCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
}

export function SimpleCard({ profile, onLike, onPass }: SimpleCardProps) {
  return (
    <View style={styles.card}>
      {/* Imagem */}
      <Image
        source={{ uri: profile.photos && profile.photos.length > 0 ? profile.photos[0] : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }}
        style={styles.image}
      />

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{profile.name}, {profile.age}</Text>
        {profile.occupation && (
          <Text style={styles.occupation}>{profile.occupation}</Text>
        )}
        {profile.bio && (
          <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
        )}
      </View>

      {/* Botões */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={onPass} style={[styles.button, styles.passButton]}>
          <Ionicons name="close" size={30} color={colors.red} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onLike} style={[styles.button, styles.likeButton]}>
          <Ionicons name="heart" size={30} color={colors.pink} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width - 32,
    height: height * 0.7,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.black,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '65%',
    resizeMode: 'cover',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: colors.white,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.black,
  },
  occupation: {
    fontSize: 16,
    color: colors.gray600,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.gray200,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.black,
  },
  passButton: {
    borderColor: colors.red,
  },
  likeButton: {
    borderColor: colors.pink,
  },
});
