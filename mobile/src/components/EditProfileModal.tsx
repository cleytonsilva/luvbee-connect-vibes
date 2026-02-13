// EditProfileModal.tsx - Modal para editar perfil do usuário
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows, borders, borderRadius } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import '../i18n';
import { useLocationData } from '../hooks/useLocationData';

const INTERESTS = [
    { id: 'comedy_club', label: 'Comédia', icon: 'happy-outline' },
    { id: 'theater', label: 'Teatro', icon: 'musical-notes-outline' },
    { id: 'museum', label: 'Museus', icon: 'color-palette-outline' },
    { id: 'library', label: 'Bibliotecas', icon: 'book-outline' },
    { id: 'music', label: 'Música', icon: 'headset-outline' },
    { id: 'food', label: 'Gastronomia', icon: 'restaurant-outline' },
    { id: 'travel', label: 'Viagem', icon: 'airplane-outline' },
    { id: 'sports', label: 'Esportes', icon: 'football-outline' },
    { id: 'movies', label: 'Cinema', icon: 'videocam-outline' },
    { id: 'nature', label: 'Natureza', icon: 'leaf-outline' },
    { id: 'party', label: 'Festas', icon: 'wine-outline' },
    { id: 'coffee', label: 'Café', icon: 'cafe-outline' },
    { id: 'art_gallery', label: 'Arte', icon: 'brush-outline' },
];

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
    const { profile, updateProfile, fetchProfile } = useAuthStore();
    const { t, i18n } = useTranslation();
    const { countries, getStates } = useLocationData();
    const [isSaving, setIsSaving] = useState(false);

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [occupation, setOccupation] = useState('');
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [interests, setInterests] = useState<string[]>([]);

    const availableStates = country ? getStates(country) : [];

    useEffect(() => {
        if (visible && profile) {
            setName(profile.name || '');
            setBio(profile.bio || '');
            setOccupation(profile.occupation || '');
            setCountry(profile.country || 'BR'); // Default Brazil
            setState(profile.state_province || '');
            setPhotos(profile.photos || []);
            setInterests(profile.interests || []);
            // Sync i18next with user preference if exists, else keep default
            if (profile.language_preference && profile.language_preference !== i18n.language) {
                i18n.changeLanguage(profile.language_preference);
            }
        }
    }, [visible, profile]);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para adicionar ao perfil.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 5],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;

            try {
                // Upload para Supabase Storage
                const userId = profile?.id;
                if (!userId) return;

                const fileName = `${userId}/${Date.now()}.jpg`;
                const response = await fetch(uri);
                const blob = await response.blob();

                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(fileName, blob, { contentType: 'image/jpeg' });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    // Fallback: usar URI local
                    setPhotos(prev => [...prev, uri]);
                    return;
                }

                const { data: urlData } = supabase.storage
                    .from('photos')
                    .getPublicUrl(fileName);

                setPhotos(prev => [...prev, urlData.publicUrl]);
            } catch (err) {
                console.error('Error uploading photo:', err);
                // Fallback: usar URI local
                setPhotos(prev => [...prev, uri]);
            }
        }
    };

    const removePhoto = (index: number) => {
        Alert.alert(
            'Remover foto',
            'Tem certeza que deseja remover esta foto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => setPhotos(prev => prev.filter((_, i) => i !== index)),
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert(t('common.error'), t('profile.name') + ' é obrigatório.');
            return;
        }
        if (!country || !state) {
            Alert.alert(t('common.error'), t('profile.location') + ' é obrigatório.');
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                name: name.trim(),
                bio: bio.trim(),
                occupation: occupation.trim(),
                country,
                state_province: state,
                language_preference: i18n.language,
                photos,
                interests,
            });
            await fetchProfile();
            Alert.alert(t('common.success'), t('profile.success_update'));
            onClose();
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert(t('common.error'), 'Não foi possível salvar as alterações. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <Ionicons name="close" size={24} color={colors.black} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('profile.edit')}</Text>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.headerButton, styles.saveButton]}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Language Selector */}
                        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
                        <View style={styles.languageContainer}>
                            {['en', 'pt', 'es'].map((lang) => (
                                <TouchableOpacity
                                    key={lang}
                                    style={[
                                        styles.langButton,
                                        i18n.language.startsWith(lang) && styles.langButtonActive
                                    ]}
                                    onPress={() => changeLanguage(lang)}
                                >
                                    <Text style={[
                                        styles.langButtonText,
                                        i18n.language.startsWith(lang) && styles.langButtonTextActive
                                    ]}>
                                        {lang === 'en' ? 'English' : lang === 'pt' ? 'Português' : 'Español'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Fotos */}
                        <Text style={styles.sectionTitle}>{t('profile.photos')}</Text>
                        <View style={styles.photosGrid}>
                            {photos.map((photo, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.photoSlot}
                                    onPress={() => removePhoto(index)}
                                    activeOpacity={0.8}
                                >
                                    <Image source={{ uri: photo }} style={styles.photoImage} contentFit="cover" />
                                    <View style={styles.removePhotoButton}>
                                        <Ionicons name="close-circle" size={24} color={colors.red} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {photos.length < 6 && (
                                <TouchableOpacity style={styles.addPhotoSlot} onPress={pickImage} activeOpacity={0.7}>
                                    <Ionicons name="add" size={32} color={colors.gray400} />
                                    <Text style={styles.addPhotoText}>Adicionar</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Nome */}
                        <Text style={styles.sectionTitle}>Nome</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder={t('profile.name')}
                                placeholderTextColor={colors.gray400}
                                maxLength={50}
                            />
                        </View>

                        {/* Bio */}
                        <Text style={styles.sectionTitle}>{t('profile.bio')}</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Conte um pouco sobre você..."
                                placeholderTextColor={colors.gray400}
                                multiline
                                numberOfLines={4}
                                maxLength={300}
                                textAlignVertical="top"
                            />
                        </View>
                        <Text style={styles.charCount}>{bio.length}/300</Text>

                        {/* Ocupação */}
                        <Text style={styles.sectionTitle}>{t('profile.occupation')}</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={occupation}
                                onChangeText={setOccupation}
                                placeholder="Ex: Designer, Engenheiro..."
                                placeholderTextColor={colors.gray400}
                                maxLength={50}
                            />
                        </View>

                        {/* Interesses */}
                        <Text style={styles.sectionTitle}>Interesses</Text>
                        <View style={styles.interestsContainer}>
                            {INTERESTS.map((item) => {
                                const isSelected = interests.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.interestChip,
                                            isSelected && styles.interestChipActive
                                        ]}
                                        onPress={() => {
                                            if (isSelected) {
                                                setInterests(prev => prev.filter(i => i !== item.id));
                                            } else {
                                                if (interests.length >= 5) {
                                                    Alert.alert('Limite atingido', 'Selecione no máximo 5 interesses.');
                                                    return;
                                                }
                                                setInterests(prev => [...prev, item.id]);
                                            }
                                        }}
                                    >
                                        <Ionicons
                                            name={item.icon as any}
                                            size={16}
                                            color={isSelected ? colors.white : colors.gray600}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={[
                                            styles.interestChipText,
                                            isSelected && styles.interestChipTextActive
                                        ]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Localização (País e Estado) */}
                        <Text style={styles.sectionTitle}>{t('profile.location')}</Text>

                        {/* País */}
                        <Text style={styles.subLabel}>{t('profile.country')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {countries.map((c) => (
                                <TouchableOpacity
                                    key={c.value}
                                    style={[
                                        styles.chip,
                                        country === c.value && styles.chipActive
                                    ]}
                                    onPress={() => {
                                        setCountry(c.value);
                                        setState(''); // Reset state on country change
                                    }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        country === c.value && styles.chipTextActive
                                    ]}>{c.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Estado */}
                        {country && (
                            <>
                                <Text style={styles.subLabel}>{t('profile.state')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                    {availableStates.map((s) => (
                                        <TouchableOpacity
                                            key={s}
                                            style={[
                                                styles.chip,
                                                state === s && styles.chipActive
                                            ]}
                                            onPress={() => setState(s)}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                state === s && styles.chipTextActive
                                            ]}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
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
        paddingTop: spacing.xxl + 20,
        paddingBottom: spacing.md,
        backgroundColor: colors.green,
        borderBottomWidth: 3,
        borderBottomColor: colors.black,
    },
    headerButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: 'bold',
        color: colors.black,
    },
    saveButton: {
        backgroundColor: colors.black,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    saveButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.black,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    photoSlot: {
        width: 100,
        height: 130,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.black,
        position: 'relative',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    removePhotoButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.white,
        borderRadius: 12,
    },
    addPhotoSlot: {
        width: 100,
        height: 130,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.gray300,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray100,
    },
    addPhotoText: {
        fontSize: 11,
        color: colors.gray400,
        marginTop: 4,
    },
    inputContainer: {
        backgroundColor: colors.white,
        borderWidth: borders.normal,
        borderColor: colors.black,
        borderRadius: borderRadius.md,
        ...shadows.sm,
    },
    textAreaContainer: {
        minHeight: 100,
    },
    input: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: typography.sizes.base,
        color: colors.black,
    },
    textArea: {
        minHeight: 90,
    },
    charCount: {
        fontSize: 12,
        color: colors.gray400,
        textAlign: 'right',
        marginTop: 4,
    },
    // New Styles for Location & Language
    languageContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    langButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        borderWidth: 1,
        borderColor: colors.gray300,
    },
    langButtonActive: {
        backgroundColor: colors.black,
        borderColor: colors.black,
    },
    langButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray600,
    },
    langButtonTextActive: {
        color: colors.white,
    },
    subLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray500,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        marginLeft: 4,
    },
    chipScroll: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    chipActive: {
        backgroundColor: colors.blue,
        borderColor: colors.black,
    },
    chipText: {
        fontSize: 13,
        color: colors.black,
    },
    chipTextActive: {
        color: colors.white,
        fontWeight: 'bold',
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    interestChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.gray100,
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    interestChipActive: {
        backgroundColor: colors.black,
        borderColor: colors.black,
    },
    interestChipText: {
        fontSize: 13,
        color: colors.gray600,
        fontWeight: '500',
    },
    interestChipTextActive: {
        color: colors.white,
        fontWeight: 'bold',
    },
});
