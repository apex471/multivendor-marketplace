'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN' | 'CNY';

export interface Translations {
  home: string;
  shop: string;
  feed: string;
  explore: string;
  cart: string;
  checkout: string;
  search: string;
  popular_products: string;
  top_vendors: string;
  about_us: string;
  help: string;
  add_to_cart: string;
  buy_now: string;
  in_stock: string;
  out_of_stock: string;
  color: string;
  size: string;
  quantity: string;
  view_all: string;
  explore_all: string;
  verified: string;
  products_count: string;
  avg_rating: string;
  trending_tags: string;
  latest_posts: string;
}

const translationMap: Record<Language, Translations> = {
  en: {
    home: 'Home',
    shop: 'Shop',
    feed: 'Fashion Feed',
    explore: 'Explore',
    cart: 'Cart',
    checkout: 'Checkout',
    search: 'Search products...',
    popular_products: 'Popular Products',
    top_vendors: 'Top Vendors',
    about_us: 'About Us',
    help: 'Help & Support',
    add_to_cart: 'Add to Cart',
    buy_now: 'Buy Now',
    in_stock: 'In Stock',
    out_of_stock: 'Out of Stock',
    color: 'Color',
    size: 'Size',
    quantity: 'Quantity',
    view_all: 'View All',
    explore_all: 'Explore All',
    verified: 'Verified',
    products_count: 'products',
    avg_rating: 'Average Rating',
    trending_tags: 'Trending Tags',
    latest_posts: 'Latest style inspiration',
  },
  es: {
    home: 'Inicio',
    shop: 'Tienda',
    feed: 'Feed de Moda',
    explore: 'Explorar',
    cart: 'Carrito',
    checkout: 'Pagar',
    search: 'Buscar productos...',
    popular_products: 'Productos Populares',
    top_vendors: 'Mejores Vendedores',
    about_us: 'Sobre Nosotros',
    help: 'Ayuda y Soporte',
    add_to_cart: 'Añadir al Carrito',
    buy_now: 'Comprar Ahora',
    in_stock: 'En Stock',
    out_of_stock: 'Agotado',
    color: 'Color',
    size: 'Talla',
    quantity: 'Cantidad',
    view_all: 'Ver Todo',
    explore_all: 'Explorar Todo',
    verified: 'Verificado',
    products_count: 'productos',
    avg_rating: 'Calificación Promedio',
    trending_tags: 'Etiquetas Populares',
    latest_posts: 'Última inspiración de estilo',
  },
  fr: {
    home: 'Accueil',
    shop: 'Boutique',
    feed: 'Flux Mode',
    explore: 'Explorer',
    cart: 'Panier',
    checkout: 'Caisse',
    search: 'Rechercher des produits...',
    popular_products: 'Produits Populaires',
    top_vendors: 'Meilleurs Vendeurs',
    about_us: 'À Propos',
    help: 'Aide & Support',
    add_to_cart: 'Ajouter au Panier',
    buy_now: 'Acheter',
    in_stock: 'En Stock',
    out_of_stock: 'Rupture de Stock',
    color: 'Couleur',
    size: 'Taille',
    quantity: 'Quantité',
    view_all: 'Voir Tout',
    explore_all: 'Tout Explorer',
    verified: 'Vérifié',
    products_count: 'produits',
    avg_rating: 'Note Moyenne',
    trending_tags: 'Tags Tendances',
    latest_posts: 'Dernières inspirations style',
  },
  de: {
    home: 'Startseite',
    shop: 'Geschäft',
    feed: 'Mode-Feed',
    explore: 'Entdecken',
    cart: 'Warenkorb',
    checkout: 'Kasse',
    search: 'Produkte suchen...',
    popular_products: 'Beliebte Produkte',
    top_vendors: 'Top-Verkäufer',
    about_us: 'Über Uns',
    help: 'Hilfe & Support',
    add_to_cart: 'In den Warenkorb',
    buy_now: 'Jetzt Kaufen',
    in_stock: 'Auf Lager',
    out_of_stock: 'Ausverkauft',
    color: 'Farbe',
    size: 'Größe',
    quantity: 'Menge',
    view_all: 'Alle Anzeigen',
    explore_all: 'Alle Erkunden',
    verified: 'Verifiziert',
    products_count: 'Produkte',
    avg_rating: 'Durchschnittsnote',
    trending_tags: 'Beliebte Tags',
    latest_posts: 'Neueste Style-Inspirationen',
  },
  zh: {
    home: '首页',
    shop: '商店',
    feed: '时尚动态',
    explore: '探索',
    cart: '购物车',
    checkout: '结账',
    search: '搜索商品...',
    popular_products: '热门商品',
    top_vendors: '顶级商家',
    about_us: '关于我们',
    help: '帮助与支持',
    add_to_cart: '加入购物车',
    buy_now: '立即购买',
    in_stock: '有货',
    out_of_stock: '无货',
    color: '颜色',
    size: '尺寸',
    quantity: '数量',
    view_all: '查看全部',
    explore_all: '探索全部',
    verified: '已认证',
    products_count: '件商品',
    avg_rating: '平均评分',
    trending_tags: '热门标签',
    latest_posts: '最新时尚灵感',
  },
};

const currencyRates: Record<Currency, { rate: number; symbol: string }> = {
  USD: { rate: 1.0, symbol: '$' },
  EUR: { rate: 0.92, symbol: '€' },
  GBP: { rate: 0.78, symbol: '£' },
  NGN: { rate: 1500.0, symbol: '₦' },
  CNY: { rate: 7.25, symbol: '¥' },
};

interface LocalizationContextType {
  language: Language;
  currency: Currency;
  setLanguage: (lang: Language) => void;
  setCurrency: (curr: Currency) => void;
  t: (key: keyof Translations) => string;
  formatPrice: (usdAmount: number) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<Currency, { rate: number; symbol: string }>>({
    USD: { rate: 1.0, symbol: '$' },
    EUR: { rate: 0.92, symbol: '€' },
    GBP: { rate: 0.78, symbol: '£' },
    NGN: { rate: 1500.0, symbol: '₦' },
    CNY: { rate: 7.25, symbol: '¥' },
  });

  // Detect and set local settings on mount, and load live rates
  useEffect(() => {
    const savedLang = localStorage.getItem('pref_lang') as Language | null;
    const savedCurr = localStorage.getItem('pref_curr') as Currency | null;

    if (savedLang && Object.keys(translationMap).includes(savedLang)) {
      setLanguageState(savedLang);
    } else {
      // Browser detection
      const navLang = navigator.language.split('-')[0] as Language;
      if (Object.keys(translationMap).includes(navLang)) {
        setLanguageState(navLang);
      }
    }

    if (savedCurr && savedCurr in rates) {
      setCurrencyState(savedCurr);
    } else {
      // Region/Timezone currency inference
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Europe')) {
          setCurrencyState('EUR');
        } else if (tz.includes('London') || tz.includes('Europe/London')) {
          setCurrencyState('GBP');
        } else if (tz.includes('Lagos') || tz.includes('Africa/Lagos') || tz.includes('Africa/Cairo')) {
          setCurrencyState('NGN');
        } else if (tz.includes('Shanghai') || tz.includes('Asia/Shanghai') || tz.includes('Asia/Hong_Kong')) {
          setCurrencyState('CNY');
        }
      } catch (e) {
        console.warn('Could not auto-detect local currency, defaulting to USD', e);
      }
    }

    // Fetch real-time market conversion rates
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.rates) {
          setRates((prev) => ({
            USD: { rate: 1.0, symbol: '$' },
            EUR: { rate: data.rates.EUR || prev.EUR.rate, symbol: '€' },
            GBP: { rate: data.rates.GBP || prev.GBP.rate, symbol: '£' },
            NGN: { rate: data.rates.NGN || prev.NGN.rate, symbol: '₦' },
            CNY: { rate: data.rates.CNY || prev.CNY.rate, symbol: '¥' },
          }));
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch real-time exchange rates, using fallback rates', err);
      });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pref_lang', lang);
  };

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('pref_curr', curr);
  };

  const t = (key: keyof Translations): string => {
    return translationMap[language][key] || translationMap['en'][key] || '';
  };

  const formatPrice = (usdAmount: number): string => {
    const { rate, symbol } = rates[currency];
    const converted = usdAmount * rate;
    // Format options: NGN matches integer usually, others have 2 decimal places
    const decimals = currency === 'NGN' ? 0 : 2;
    return `${symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  return (
    <LocalizationContext.Provider
      value={{
        language,
        currency,
        setLanguage,
        setCurrency,
        t,
        formatPrice,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}
