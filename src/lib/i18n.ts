// lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Lấy tài nguyên từ các file JSON
import translationEN from '@/../public/locales/en/translation.json';
import translationVI from '@/../public/locales/vi/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  vi: {
    translation: translationVI,
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "vi", // ngôn ngữ mặc định
    fallbackLng: "vi", // ngôn ngữ dự phòng nếu không tìm thấy key
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;