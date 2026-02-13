import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Linking,
    Platform,
    TextInput,
    Alert,
    FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { LocationWithStats } from '../services/locationService';
import { getPlaceImageUrl } from '../services/imageCache';
import { getDeterministicImage } from '../services/images';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/authStore';

const { width, height } = Dimensions.get('window');

interface PlaceDetailModalProps {
    visible: boolean;
    place: LocationWithStats | null;
    onClose: () => void;
    onUnlike?: () => void;
    likesCount?: number;
    isLiked?: boolean;
    showActions?: boolean;
}

interface PlaceLiker {
    id: string;
    name: string;
    photos: string[];
    likedAt: string;
}

interface PlaceComment {
    id: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    text: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    createdAt: string;
}

// Helper para calcular distância (Haversine) em km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

function formatVibeText(vibe: string) {
    if (!vibe) return '';
    const clean = vibe.replace(/_/g, ' ');
    return clean.replace(/\b\w/g, l => l.toUpperCase());
}

export function PlaceDetailModal({
    visible,
    place,
    onClose,
    onUnlike,
    likesCount = 0,
    isLiked = false,
    showActions = true,
}: PlaceDetailModalProps) {
    const { user } = useAuthStore();
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isLoadingImage, setIsLoadingImage] = useState(false);

    // Data States
    const [likers, setLikers] = useState<PlaceLiker[]>([]);
    const [isLoadingLikers, setIsLoadingLikers] = useState(false);

    const [comments, setComments] = useState<PlaceComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentSentiment, setCommentSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
    const [isSendingComment, setIsSendingComment] = useState(false);

    const [hasCheckedIn, setHasCheckedIn] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'info' | 'people' | 'comments'>('info');

    // Reset state on open/change
    useEffect(() => {
        if (visible && place) {
            // Resetar estados para evitar mostrar dados de outro lugar
            setLikers([]);
            setComments([]);
            setHasCheckedIn(false);
            setNewComment('');
            setCommentSentiment('neutral');
            setActiveTab('info');

            // Carregar dados
            const imgCategory = place.type || place.category || 'default';
            setImageUrl(getDeterministicImage(place.id || 'default', imgCategory));

            loadRealImage();
            loadLikers();
            loadComments();
            checkIfCheckedIn();
        }
    }, [place?.id, visible]); // Dependência explícita no ID do lugar

    const loadRealImage = async () => {
        if (!place) return;
        const photoRef = place.photoReference ||
            place.photos?.[0]?.name ||
            place.photos?.[0]?.photo_reference;
        if (!photoRef || !place.id) return;

        setIsLoadingImage(true);
        try {
            const cachedUrl = await getPlaceImageUrl(place.id, photoRef, 800);
            if (cachedUrl) setImageUrl(cachedUrl);
        } catch (error) {
            console.error('Erro ao carregar imagem:', error);
        } finally {
            setIsLoadingImage(false);
        }
    };

    const loadLikers = async () => {
        if (!place?.id) return;
        setIsLoadingLikers(true);
        try {
            const { data, error } = await supabase
                .from('user_locations')
                .select('user_id, created_at')
                .eq('google_place_id', place.google_place_id || place.id)
                .eq('status', 'liked')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (data && data.length > 0) {
                const userIds = data.map(d => d.user_id);
                const { data: users } = await supabase
                    .from('users')
                    .select('id, name, photos')
                    .in('id', userIds);

                const likersList: PlaceLiker[] = (users || []).map(u => {
                    const match = data.find(d => d.user_id === u.id);
                    return {
                        id: u.id,
                        name: u.name || 'Anônimo',
                        photos: u.photos || [],
                        likedAt: match?.created_at || '',
                    };
                });
                setLikers(likersList);
            }
        } catch (err) {
            console.error('Erro ao carregar pessoas:', err);
        } finally {
            setIsLoadingLikers(false);
        }
    };

    const loadComments = async () => {
        if (!place?.id) return;
        try {
            // Importante: filtrar pelo ID correto do lugar
            const { data, error } = await supabase
                .from('place_comments')
                .select('id, user_id, text, sentiment, created_at')
                .eq('place_id', place.id) // Garante que é deste lugar específico
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                return;
            }

            if (data && data.length > 0) {
                const userIds = [...new Set(data.map(d => d.user_id))];
                const { data: users } = await supabase
                    .from('users')
                    .select('id, name, photos')
                    .in('id', userIds);

                const commentsList: PlaceComment[] = data.map(c => {
                    const u = users?.find(u => u.id === c.user_id);
                    return {
                        id: c.id,
                        userId: c.user_id,
                        userName: u?.name || 'Anônimo',
                        userPhoto: u?.photos?.[0],
                        text: c.text,
                        sentiment: c.sentiment as any,
                        createdAt: c.created_at,
                    };
                });
                setComments(commentsList);
            }
        } catch (err) {
        }
    };

    const checkIfCheckedIn = async () => {
        if (!place?.id || !user?.id) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('place_checkins')
                .select('id')
                .eq('user_id', user.id)
                .eq('place_id', place.id)
                .gte('created_at', today)
                .maybeSingle();

            setHasCheckedIn(!!data);
        } catch {
            // Ignorar erro se tabela não existir
        }
    };

    const handleCheckin = async () => {
        if (!place?.id || !user?.id || hasCheckedIn) return;

        // Validar geolocalização
        if (!place.lat || !place.lng) {
            Alert.alert('Erro', 'Este lugar não possui coordenadas para check-in.');
            return;
        }

        setIsCheckingIn(true);
        try {
            // 1. Pedir permissão
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos da sua localização para confirmar o check-in.');
                setIsCheckingIn(false);
                return;
            }

            // 2. Obter localização atual
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const userLat = location.coords.latitude;
            const userLng = location.coords.longitude;

            const placeLat = parseFloat(place.lat);
            const placeLng = parseFloat(place.lng);

            // 3. Calcular distância
            const distKm = getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng);

            // Limite de 200 metros (0.2 km)
            if (distKm > 0.2) {
                Alert.alert(
                    'Você está longe! 📍',
                    `O check-in só é permitido no local. Você está a ${(distKm).toFixed(1)}km de distância.`
                );
                setIsCheckingIn(false);
                return;
            }

            // 4. Salvar Check-in
            const { error } = await supabase
                .from('place_checkins')
                .insert({
                    user_id: user.id,
                    place_id: place.id,
                    google_place_id: place.google_place_id || place.id,
                });

            if (error) throw error;

            setHasCheckedIn(true);
            Alert.alert('Check-in realizado! 📍', `Você marcou presença em ${place.name}`);
        } catch (err) {
            console.error('Erro no check-in:', err);
            Alert.alert('Erro', 'Não foi possível fazer check-in. Tente novamente.');
        } finally {
            setIsCheckingIn(false);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !place?.id || !user?.id) return;
        setIsSendingComment(true);
        try {
            const { error } = await supabase
                .from('place_comments')
                .insert({
                    user_id: user.id,
                    place_id: place.id,
                    text: newComment.trim(),
                    sentiment: commentSentiment, // Add sentiment
                });

            if (error) throw error;

            setNewComment('');
            setCommentSentiment('neutral'); // Reset sentiment
            await loadComments(); // Reload to show new comment
        } catch (err) {
            console.error('Erro ao enviar comentário:', err);
            Alert.alert('Erro', 'Não foi possível enviar o comentário.');
        } finally {
            setIsSendingComment(false);
        }
    };

    const openInMaps = () => {
        if (!place?.lat || !place?.lng) return;
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const latLng = `${place.lat},${place.lng}`;
        const label = encodeURIComponent(place.name);
        const url = Platform.select({
            ios: `${scheme}?q=${label}&ll=${latLng}`,
            android: `${scheme}${latLng}?q=${latLng}(${label})`,
        });
        if (url) Linking.openURL(url);
    };

    const formatTimeAgo = (dateStr: string) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d`;
        return `${Math.floor(days / 30)}m`;
    };

    // Render sentiment icon helper
    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return '👍';
            case 'negative': return '👎';
            default: return '💬';
        }
    };

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return colors.green;
            case 'negative': return colors.red;
            default: return colors.gray500;
        }
    };

    if (!place) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header Image */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" transition={300} />
                    <View style={styles.imageOverlay} />

                    {isLoadingImage && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={colors.white} />
                        </View>
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                        <Ionicons name="close" size={28} color={colors.white} />
                    </TouchableOpacity>

                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{place.category || 'Local'}</Text>
                    </View>
                </View>

                {/* Title Bar */}
                <View style={styles.titleBar}>
                    <Text style={styles.title} numberOfLines={2}>{place.name}</Text>
                    <View style={styles.statsRow}>
                        {place.rating && (
                            <View style={styles.statItem}>
                                <Ionicons name="star" size={14} color={colors.yellow} />
                                <Text style={styles.statText}>{place.rating}</Text>
                            </View>
                        )}
                        {place.distance && (
                            <View style={styles.statItem}>
                                <Ionicons name="location" size={14} color={colors.blue} />
                                <Text style={styles.statText}>{place.distance}</Text>
                            </View>
                        )}
                        {place.price_level && (
                            <Text style={styles.priceText}>{'$'.repeat(Number(place.price_level))}</Text>
                        )}
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                        onPress={() => setActiveTab('info')}
                    >
                        <Ionicons name="information-circle-outline" size={18} color={activeTab === 'info' ? colors.black : colors.gray400} />
                        <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'people' && styles.tabActive]}
                        onPress={() => setActiveTab('people')}
                    >
                        <Ionicons name="people-outline" size={18} color={activeTab === 'people' ? colors.black : colors.gray400} />
                        <Text style={[styles.tabText, activeTab === 'people' && styles.tabTextActive]}>
                            Pessoas {likesCount > 0 ? `(${likesCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
                        onPress={() => setActiveTab('comments')}
                    >
                        <Ionicons name="chatbubbles-outline" size={18} color={activeTab === 'comments' ? colors.black : colors.gray400} />
                        <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
                            Opiniões {comments.length > 0 ? `(${comments.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
                    {/* ===== INFO TAB ===== */}
                    {activeTab === 'info' && (
                        <>
                            {/* Check-in Button */}
                            <TouchableOpacity
                                style={[styles.checkinButton, hasCheckedIn && styles.checkinDone]}
                                onPress={handleCheckin}
                                disabled={hasCheckedIn || isCheckingIn}
                                activeOpacity={0.7}
                            >
                                {isCheckingIn ? (
                                    <ActivityIndicator size="small" color={colors.black} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={hasCheckedIn ? 'checkmark-circle' : 'location'}
                                            size={20}
                                            color={hasCheckedIn ? colors.green : colors.black}
                                        />
                                        <Text style={styles.checkinLabel}>
                                            {hasCheckedIn ? 'Check-in realizado ✓' : 'Fazer Check-in (Local)'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Vibe */}
                            {place.vibe && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Vibe</Text>
                                    <View style={styles.vibeBadge}>
                                        <Ionicons name="sparkles" size={14} color={colors.white} />
                                        <Text style={styles.vibeText}>{formatVibeText(place.vibe)}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Address */}
                            {place.address && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Endereço</Text>
                                    <TouchableOpacity style={styles.addressContainer} onPress={openInMaps} activeOpacity={0.7}>
                                        <Ionicons name="navigate-outline" size={20} color={colors.blue} />
                                        <Text style={styles.addressText}>{place.address}</Text>
                                        <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Description */}
                            {place.description && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Sobre</Text>
                                    <Text style={styles.descriptionText}>{place.description}</Text>
                                </View>
                            )}

                            {place.likedAt && (
                                <View style={styles.likedAtContainer}>
                                    <Ionicons name="time-outline" size={14} color={colors.gray400} />
                                    <Text style={styles.likedAtText}>Curtido {place.likedAt}</Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* ===== PEOPLE TAB ===== */}
                    {activeTab === 'people' && (
                        <View style={styles.peopleTab}>
                            <Text style={styles.sectionTitle}>
                                {likesCount > 0
                                    ? `${likesCount} pessoa${likesCount > 1 ? 's' : ''} curtiu este lugar`
                                    : 'Ninguém curtiu este lugar ainda'}
                            </Text>

                            {isLoadingLikers ? (
                                <ActivityIndicator size="large" color={colors.pink} style={{ marginTop: 20 }} />
                            ) : likers.length > 0 ? (
                                likers.map(liker => (
                                    <View key={liker.id} style={styles.likerRow}>
                                        <View style={styles.likerAvatar}>
                                            {liker.photos[0] ? (
                                                <Image source={{ uri: liker.photos[0] }} style={styles.likerAvatarImg} contentFit="cover" />
                                            ) : (
                                                <Text style={styles.likerAvatarPlaceholder}>👤</Text>
                                            )}
                                        </View>
                                        <View style={styles.likerInfo}>
                                            <Text style={styles.likerName}>
                                                {liker.id === user?.id ? 'Você' : liker.name}
                                            </Text>
                                            <Text style={styles.likerTime}>
                                                Curtiu {formatTimeAgo(liker.likedAt)} atrás
                                            </Text>
                                        </View>
                                        <Ionicons name="heart" size={16} color={colors.pink} />
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyPeople}>
                                    <Text style={{ fontSize: 40 }}>🫥</Text>
                                    <Text style={styles.emptyText}>Seja o primeiro a curtir!</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* ===== COMMENTS TAB (OPINIONS) ===== */}
                    {activeTab === 'comments' && (
                        <View style={styles.commentsTab}>
                            <Text style={styles.sectionTitle}>Opiniões da Galera</Text>

                            {comments.length > 0 ? (
                                comments.map(comment => (
                                    <View key={comment.id} style={styles.commentRow}>
                                        <View style={styles.commentAvatar}>
                                            {comment.userPhoto ? (
                                                <Image source={{ uri: comment.userPhoto }} style={styles.commentAvatarImg} contentFit="cover" />
                                            ) : (
                                                <Text style={{ fontSize: 16 }}>👤</Text>
                                            )}
                                        </View>
                                        <View style={styles.commentBodyContainer}>
                                            <View style={styles.commentContent}>
                                                <Text style={styles.commentName}>
                                                    {comment.userId === user?.id ? 'Você' : comment.userName}
                                                </Text>
                                                <Text style={styles.commentText}>{comment.text}</Text>
                                            </View>

                                            {/* Sentiment Emoji (Right Side) */}
                                            {comment.sentiment && comment.sentiment !== 'neutral' && (
                                                <View style={styles.sentimentRight}>
                                                    <Text style={styles.sentimentEmojiLarge}>
                                                        {getSentimentIcon(comment.sentiment)}
                                                    </Text>
                                                    <Text style={styles.commentTimeSmall}>{formatTimeAgo(comment.createdAt)}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyPeople}>
                                    <Text style={{ fontSize: 40 }}>💬</Text>
                                    <Text style={styles.emptyText}>Nenhuma opinião ainda. Dê a sua!</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={{ height: 160 }} />
                </ScrollView>

                {/* Bottom Actions */}
                {showActions && (
                    <View style={styles.actionsContainer}>
                        {activeTab === 'comments' ? (
                            <View style={styles.commentInputContainer}>
                                {/* Sentiment Selector */}
                                <View style={styles.sentimentSelector}>
                                    <TouchableOpacity
                                        style={[styles.sentimentButton, commentSentiment === 'positive' && styles.sentimentButtonActive, { borderColor: colors.green }]}
                                        onPress={() => setCommentSentiment(commentSentiment === 'positive' ? 'neutral' : 'positive')}
                                    >
                                        <Text>👍 Gostei</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.sentimentButton, commentSentiment === 'negative' && styles.sentimentButtonActive, { borderColor: colors.red }]}
                                        onPress={() => setCommentSentiment(commentSentiment === 'negative' ? 'neutral' : 'negative')}
                                    >
                                        <Text>👎 Não curti</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.commentInputRow}>
                                    <TextInput
                                        style={styles.commentInput}
                                        value={newComment}
                                        onChangeText={setNewComment}
                                        placeholder="Sua opinião sobre o lugar..."
                                        placeholderTextColor={colors.gray400}
                                        maxLength={200}
                                        multiline
                                    />
                                    <TouchableOpacity
                                        style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                                        onPress={handleSendComment}
                                        disabled={!newComment.trim() || isSendingComment}
                                    >
                                        {isSendingComment ? (
                                            <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                            <Ionicons name="send" size={20} color={colors.white} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : isLiked && onUnlike ? (
                            <TouchableOpacity style={styles.unlikeButton} onPress={onUnlike} activeOpacity={0.8}>
                                <Ionicons name="heart-dislike" size={22} color={colors.white} />
                                <Text style={styles.unlikeButtonText}>Descurtir</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.mapsButton} onPress={openInMaps} activeOpacity={0.8}>
                                <Ionicons name="navigate" size={22} color={colors.white} />
                                <Text style={styles.mapsButtonText}>Abrir no Maps</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    imageContainer: {
        height: height * 0.28,
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        backgroundColor: colors.yellow,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.black,
    },
    categoryBadgeText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.black,
    },
    titleBar: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.black,
        marginBottom: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 13,
        color: colors.gray600,
        fontWeight: '500',
    },
    priceText: {
        fontSize: 13,
        color: colors.green,
        fontWeight: 'bold',
    },
    // Tabs
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 2,
        borderBottomColor: colors.gray200,
        marginTop: spacing.sm,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.md,
    },
    tabActive: {
        borderBottomWidth: 3,
        borderBottomColor: colors.black,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.gray400,
    },
    tabTextActive: {
        color: colors.black,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    // Check-in
    checkinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.yellow,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.black,
        marginBottom: spacing.lg,
    },
    checkinDone: {
        backgroundColor: colors.green + '30',
        borderColor: colors.green,
    },
    checkinLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.black,
    },
    // Sections
    section: { marginBottom: spacing.lg },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.black,
        marginBottom: spacing.sm,
    },
    vibeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.blue,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    vibeText: { fontSize: 14, color: colors.white, fontWeight: '600' },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.gray100,
        borderRadius: 12,
        padding: spacing.md,
    },
    addressText: { flex: 1, fontSize: 14, color: colors.gray700 },
    descriptionText: { fontSize: 14, color: colors.gray600, lineHeight: 22 },
    likedAtContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    likedAtText: { fontSize: 12, color: colors.gray400 },
    // People tab
    peopleTab: { paddingTop: spacing.sm },
    likerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    likerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.black,
        overflow: 'hidden',
    },
    likerAvatarImg: { width: '100%', height: '100%' },
    likerAvatarPlaceholder: { fontSize: 20 },
    likerInfo: { flex: 1, marginLeft: spacing.md },
    likerName: { fontSize: 15, fontWeight: '600', color: colors.black },
    likerTime: { fontSize: 12, color: colors.gray400, marginTop: 2 },
    emptyPeople: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: 14,
        color: colors.gray500,
        marginTop: spacing.sm,
    },
    // Comments tab
    commentsTab: { paddingTop: spacing.sm },
    commentRow: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.gray200,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.black,
        marginRight: spacing.sm,
        position: 'relative',
    },
    commentAvatarImg: { width: '100%', height: '100%', borderRadius: 18 },

    sentimentBadgeSmall: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.white,
    },
    sentimentEmojiSmall: { fontSize: 10 },

    // Updated Comment Styles
    commentBodyContainer: {
        flex: 1,
        backgroundColor: colors.gray100,
        borderRadius: 16,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    commentContent: {
        flex: 1,
        marginRight: spacing.sm,
    },
    commentName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.black,
        marginBottom: 2
    },
    commentText: {
        fontSize: 14,
        color: colors.gray800,
        lineHeight: 20
    },
    sentimentRight: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.xs,
    },
    sentimentEmojiLarge: {
        fontSize: 24,
    },
    commentTimeSmall: {
        fontSize: 10,
        color: colors.gray400,
        marginTop: 2,
    },

    // Bottom actions
    actionsContainer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
    },
    commentInputContainer: {
        gap: spacing.sm,
    },
    sentimentSelector: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: 4,
    },
    sentimentButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: colors.gray100,
        borderColor: colors.gray300,
    },
    sentimentButtonActive: {
        backgroundColor: colors.white,
        borderWidth: 2,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    commentInput: {
        flex: 1,
        backgroundColor: colors.gray100,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.gray300,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.black,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.blue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.black,
    },
    sendButtonDisabled: {
        backgroundColor: colors.gray300,
        borderColor: colors.gray400,
    },
    unlikeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.red || '#EF4444',
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.black,
    },
    unlikeButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.white },
    mapsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.blue,
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.black,
    },
    mapsButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.white },
});
