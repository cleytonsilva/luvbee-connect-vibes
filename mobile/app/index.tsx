import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../src/constants/theme';

export default function Index() {
    const { isAuthenticated, isLoading, initialize } = useAuthStore();
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        // Initialize auth state
        initialize();

        // Check onboarding status
        const checkOnboarding = async () => {
            try {
                const value = await AsyncStorage.getItem('hasSeenOnboarding');
                setHasSeenOnboarding(value === 'true');
            } catch (e) {
                setHasSeenOnboarding(false);
            }
        };

        checkOnboarding();
    }, [initialize]);

    if (isLoading || hasSeenOnboarding === null) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.logo}>💕</Text>
                <Text style={styles.loadingText}>Luvbee</Text>
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/discover" />;
    }

    if (!hasSeenOnboarding) {
        return <Redirect href="/onboarding" />;
    }

    return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.yellow,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        fontSize: 80,
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.black,
    },
});
