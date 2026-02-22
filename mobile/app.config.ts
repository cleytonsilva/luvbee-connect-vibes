import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name: config.name || "Luvbee",
        slug: config.slug || "luvbee-dating",
        ios: {
            ...config.ios,
            config: {
                ...config.ios?.config,
                googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS || "",
            },
        },
        android: {
            ...config.android,
            config: {
                ...config.android?.config,
                googleMaps: {
                    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID || "",
                },
            },
        },
    };
};
