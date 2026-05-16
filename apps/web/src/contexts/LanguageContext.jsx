import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'es';
  });
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const SUPPORTED_LANGUAGES = [
    'es', 'en', 'pt', 'fr', 'de', 'zh', 'ja', 'ar', 'ru', 
    'it', 'nl', 'sv', 'ko', 'th', 'tr', 'el', 'pl'
  ];

  const fetchTranslations = async () => {
    try {
      const records = await pb.collection('translations').getFullList({
        $autoCancel: false,
      });
      
      const translationsMap = {};
      records.forEach(record => {
        translationsMap[record.key] = {};
        SUPPORTED_LANGUAGES.forEach(lang => {
          translationsMap[record.key][lang] = record[lang];
        });
      });
      
      setTranslations(translationsMap);
    } catch (error) {
      console.error('Failed to fetch translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
  }, []);

  const setLanguage = useCallback((langCode) => {
    setCurrentLanguage(langCode);
    localStorage.setItem('selectedLanguage', langCode);
  }, []);

  const getTranslation = useCallback((key) => {
    if (!translations[key]) return key;
    return translations[key][currentLanguage] || translations[key]['es'] || key;
  }, [translations, currentLanguage]);

  const value = {
    currentLanguage,
    setLanguage,
    getTranslation,
    isLoading,
    refreshTranslations: fetchTranslations
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};