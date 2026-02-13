import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

const resources = {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
};

i18n
    .use(initReactI18next)
    .init({
        // @ts-ignore: 'v3' is required for Android compatibility/JSON handling
        compatibilityJSON: 'v3',
        resources,
        // Ensure we get a valid string or fallback to 'en'
        lng: Localization.getLocales()[0]?.languageCode ?? 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false // React Native doesn't support Suspense yet
        }
    });

export default i18n;
