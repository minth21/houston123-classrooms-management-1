"use client";
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe2 } from 'lucide-react';

// A styled language switcher consistent with existing UI components
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [lang, setLang] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleChanged = (lng: string) => setLang(lng);
    i18n.on('languageChanged', handleChanged);
    return () => { i18n.off('languageChanged', handleChanged); };
  }, []);

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  const shortLabels: Record<string,string> = { vi: 'VN', en: 'EN' };
  const fullLabels: Record<string,string> = { vi: t('common.languages.vi'), en: t('common.languages.en') };

  return (
    <div className={compact ? 'min-w-[5.5rem]' : 'min-w-[6.5rem]'}>
      <Select value={lang} onValueChange={handleChange}>
        <SelectTrigger className="h-9 pl-2 pr-2 sm:pr-3 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
          <Globe2 className="h-4 w-4 opacity-70 shrink-0" />
          <span className="hidden xs:inline sm:hidden font-medium tracking-wide uppercase">
            {shortLabels[lang]}
          </span>
          <span className="hidden sm:inline whitespace-nowrap max-w-[6rem] overflow-hidden text-ellipsis">
            {fullLabels[lang]}
          </span>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[9rem]">
          <SelectItem value="vi">🇻🇳 {fullLabels.vi}</SelectItem>
          <SelectItem value="en">🇺🇸 {fullLabels.en}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
