// PreferencesModal.tsx - Modal para editar preferências de busca
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows, borders, borderRadius } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../services/supabase';

interface PreferencesModalProps {
    visible: boolean;
    onClose: () => void;
}

const LOOKING_FOR_OPTIONS = [
    { value: 'relationship', label: 'Relacionamento sério', icon: '💕' },
    { value: 'casual', label: 'Algo casual', icon: '🔥' },
    { value: 'friendship', label: 'Amizade', icon: '🤝' },
    { value: 'unsure', label: 'Ainda não sei', icon: '🤷' },
] as const;

// Interesses categorizados para cálculo de compatibilidade
const INTEREST_CATEGORIES = [
    {
        title: '🍽️ Comida',
        emoji: '🍽️',
        tags: ['Comida japonesa', 'Pizza', 'Hambúrguer', 'Comida mexicana', 'Vegano', 'Churrasco', 'Sushi', 'Comida italiana', 'Street food', 'Doceria'],
    },
    {
        title: '🍹 Bebidas',
        emoji: '🍹',
        tags: ['Cerveja artesanal', 'Vinho', 'Cocktails', 'Café especial', 'Chá', 'Drinks tropicais', 'Sem álcool', 'Whisky', 'Gin', 'Açaí'],
    },
    {
        title: '🌟 Estilo de Vida',
        emoji: '🌟',
        tags: ['Festas', 'Baladas', 'Barzinho', 'Cinema', 'Teatro', 'Música ao vivo', 'Dança', 'Yoga', 'Academia', 'Corrida', 'Natureza', 'Praia', 'Viagens'],
    },
    {
        title: '🧩 Curiosidades',
        emoji: '🧩',
        tags: ['Games', 'Board games', 'Quiz night', 'Leitura', 'Arte', 'Fotografia', 'Podcasts', 'Astrologia', 'Anime', 'Filmes cult'],
    },
];

export function PreferencesModal({ visible, onClose }: PreferencesModalProps) {
    const { profile, user, fetchProfile } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);

    const [ageMin, setAgeMin] = useState(18);
    const [ageMax, setAgeMax] = useState(50);
    const [distance, setDistance] = useState(50);
    const [lookingFor, setLookingFor] = useState<string>('unsure');
    const [showMe, setShowMe] = useState(true);
    const [interests, setInterests] = useState<string[]>([]);

    useEffect(() => {
        if (visible && profile) {
            setAgeMin(profile.preferred_age_min || 18);
            setAgeMax(profile.preferred_age_max || 50);
            setDistance(profile.preferred_distance || 50);
            setLookingFor(profile.looking_for || 'unsure');
            setShowMe(profile.show_me !== false);
            setInterests(profile.vibes || []);
        }
    }, [visible, profile]);

    const toggleInterest = (tag: string) => {
        setInterests(prev =>
            prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]
        );
    };

    const adjustAge = (type: 'min' | 'max', delta: number) => {
        if (type === 'min') {
            const newVal = Math.max(18, Math.min(ageMax - 1, ageMin + delta));
            setAgeMin(newVal);
        } else {
            const newVal = Math.max(ageMin + 1, Math.min(99, ageMax + delta));
            setAgeMax(newVal);
        }
    };

    const adjustDistance = (delta: number) => {
        setDistance(prev => Math.max(5, Math.min(200, prev + delta)));
    };

    const handleSave = async () => {
        if (!user?.id) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    preferences: {
                        age_min: ageMin,
                        age_max: ageMax,
                        distance_max: distance,
                        looking_for: lookingFor,
                        interests,
                    },
                    is_active: showMe,
                })
                .eq('id', user.id);

            if (error) throw error;

            await fetchProfile();
            Alert.alert('Sucesso', 'Preferências atualizadas!');
            onClose();
        } catch (error) {
            console.error('Error saving preferences:', error);
            Alert.alert('Erro', 'Não foi possível salvar as preferências. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <Ionicons name="close" size={24} color={colors.black} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Preferências</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={[styles.headerButton, styles.saveButton]}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={styles.saveButtonText}>Salvar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Visibilidade */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="eye-outline" size={20} color={colors.black} />
                            <Text style={styles.sectionTitle}>Visibilidade</Text>
                        </View>
                        <View style={styles.toggleRow}>
                            <View>
                                <Text style={styles.toggleLabel}>Mostrar meu perfil</Text>
                                <Text style={styles.toggleSubtext}>
                                    {showMe ? 'Você está visível para outras pessoas' : 'Seu perfil está oculto'}
                                </Text>
                            </View>
                            <Switch
                                value={showMe}
                                onValueChange={setShowMe}
                                trackColor={{ false: colors.gray300, true: colors.green }}
                                thumbColor={colors.white}
                            />
                        </View>
                    </View>

                    {/* O que procura */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="heart-outline" size={20} color={colors.black} />
                            <Text style={styles.sectionTitle}>O que procura</Text>
                        </View>
                        <View style={styles.optionsGrid}>
                            {LOOKING_FOR_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optionCard,
                                        lookingFor === opt.value && styles.optionCardActive,
                                    ]}
                                    onPress={() => setLookingFor(opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.optionEmoji}>{opt.icon}</Text>
                                    <Text
                                        style={[
                                            styles.optionLabel,
                                            lookingFor === opt.value && styles.optionLabelActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Faixa etária */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people-outline" size={20} color={colors.black} />
                            <Text style={styles.sectionTitle}>Faixa etária</Text>
                        </View>
                        <View style={styles.rangeContainer}>
                            <View style={styles.rangeSide}>
                                <Text style={styles.rangeLabel}>Mínimo</Text>
                                <View style={styles.stepper}>
                                    <TouchableOpacity
                                        style={styles.stepperButton}
                                        onPress={() => adjustAge('min', -1)}
                                    >
                                        <Ionicons name="remove" size={20} color={colors.black} />
                                    </TouchableOpacity>
                                    <Text style={styles.stepperValue}>{ageMin}</Text>
                                    <TouchableOpacity
                                        style={styles.stepperButton}
                                        onPress={() => adjustAge('min', 1)}
                                    >
                                        <Ionicons name="add" size={20} color={colors.black} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.rangeSeparator}>—</Text>
                            <View style={styles.rangeSide}>
                                <Text style={styles.rangeLabel}>Máximo</Text>
                                <View style={styles.stepper}>
                                    <TouchableOpacity
                                        style={styles.stepperButton}
                                        onPress={() => adjustAge('max', -1)}
                                    >
                                        <Ionicons name="remove" size={20} color={colors.black} />
                                    </TouchableOpacity>
                                    <Text style={styles.stepperValue}>{ageMax}</Text>
                                    <TouchableOpacity
                                        style={styles.stepperButton}
                                        onPress={() => adjustAge('max', 1)}
                                    >
                                        <Ionicons name="add" size={20} color={colors.black} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Distância */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location-outline" size={20} color={colors.black} />
                            <Text style={styles.sectionTitle}>Distância máxima</Text>
                        </View>
                        <View style={styles.distanceContainer}>
                            <View style={styles.stepper}>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => adjustDistance(-5)}
                                >
                                    <Ionicons name="remove" size={20} color={colors.black} />
                                </TouchableOpacity>
                                <Text style={styles.distanceValue}>{distance} km</Text>
                                <TouchableOpacity
                                    style={styles.stepperButton}
                                    onPress={() => adjustDistance(5)}
                                >
                                    <Ionicons name="add" size={20} color={colors.black} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Interesses por Categoria */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="sparkles-outline" size={20} color={colors.black} />
                            <Text style={styles.sectionTitle}>Interesses</Text>
                        </View>
                        <Text style={styles.interestsSubtext}>
                            Selecione o que você curte! Isso influencia no cálculo de compatibilidade.
                        </Text>

                        {INTEREST_CATEGORIES.map(category => (
                            <View key={category.title} style={styles.categoryBlock}>
                                <Text style={styles.categoryTitle}>{category.title}</Text>
                                <View style={styles.tagsContainer}>
                                    {category.tags.map(tag => (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tag,
                                                interests.includes(tag) && styles.tagActive,
                                            ]}
                                            onPress={() => toggleInterest(tag)}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={[
                                                    styles.tagText,
                                                    interests.includes(tag) && styles.tagTextActive,
                                                ]}
                                            >
                                                {tag}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>

                    {interests.length > 0 && (
                        <View style={styles.selectedCount}>
                            <Text style={styles.selectedCountText}>
                                {interests.length} interesse{interests.length !== 1 ? 's' : ''} selecionado{interests.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
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
        backgroundColor: colors.yellow,
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
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.black,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.black,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.black,
    },
    toggleSubtext: {
        fontSize: 12,
        color: colors.gray500,
        marginTop: 2,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    optionCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.gray300,
        backgroundColor: colors.white,
    },
    optionCardActive: {
        borderColor: colors.pink,
        backgroundColor: colors.pink + '15',
    },
    optionEmoji: {
        fontSize: 20,
    },
    optionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray600,
        flex: 1,
    },
    optionLabelActive: {
        color: colors.black,
    },
    rangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    rangeSide: {
        alignItems: 'center',
        flex: 1,
    },
    rangeLabel: {
        fontSize: 12,
        color: colors.gray500,
        marginBottom: spacing.sm,
        fontWeight: '600',
    },
    rangeSeparator: {
        fontSize: 20,
        color: colors.gray400,
        marginTop: spacing.lg,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.black,
        overflow: 'hidden',
    },
    stepperButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    stepperValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.black,
        minWidth: 40,
        textAlign: 'center',
    },
    distanceContainer: {
        alignItems: 'center',
    },
    distanceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.black,
        minWidth: 80,
        textAlign: 'center',
    },
    interestsSubtext: {
        fontSize: 13,
        color: colors.gray500,
        marginBottom: spacing.md,
    },
    categoryBlock: {
        marginBottom: spacing.lg,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.gray700,
        marginBottom: spacing.sm,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tag: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.gray300,
        backgroundColor: colors.white,
    },
    tagActive: {
        borderColor: colors.blue,
        backgroundColor: colors.blue + '20',
    },
    tagText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray600,
    },
    tagTextActive: {
        color: colors.black,
    },
    selectedCount: {
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.green + '20',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.green,
    },
    selectedCountText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.black,
    },
});
