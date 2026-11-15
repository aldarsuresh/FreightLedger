import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import mr from './locales/mr.json';
import hi from './locales/hi.json';

i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    mr: { translation: mr },
    hi: { translation: hi },
  },
  interpolation: { escapeValue: false },
});

export default i18next;
