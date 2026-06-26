'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

type SizeCategory = 'women-tops' | 'women-bottoms' | 'men-tops' | 'men-bottoms' | 'shoes';

export default function SizeGuidePage() {
  const [activeCategory, setActiveCategory] = useState<SizeCategory>('women-tops');

  const categories = [
    { id: 'women-tops' as SizeCategory, label: "Women's Tops & Dresses", icon: '👗' },
    { id: 'women-bottoms' as SizeCategory, label: "Women's Bottoms", icon: '👖' },
    { id: 'men-tops' as SizeCategory, label: "Men's Tops & Jackets", icon: '👔' },
    { id: 'men-bottoms' as SizeCategory, label: "Men's Bottoms", icon: '🩲' },
    { id: 'shoes' as SizeCategory, label: 'Shoes & Footwear', icon: '👟' },
  ];

  const sizeCharts: Record<SizeCategory, { headers: string[]; rows: string[][] }> = {
    'women-tops': {
      headers: ['Size', 'US', 'UK', 'EU', 'Bust (in)', 'Waist (in)', 'Hip (in)'],
      rows: [
        ['XS',  '0–2',   '4–6',   '32–34', '30–31', '23–24', '33–34'],
        ['S',   '4–6',   '8–10',  '36–38', '32–33', '25–26', '35–36'],
        ['M',   '8–10',  '12–14', '40–42', '34–35', '27–29', '37–38'],
        ['L',   '12–14', '16–18', '44–46', '36–38', '30–31', '39–41'],
        ['XL',  '16–18', '20–22', '48–50', '39–41', '32–34', '42–44'],
        ['XXL', '20–22', '24–26', '52–54', '42–44', '35–37', '45–47'],
      ],
    },
    'women-bottoms': {
      headers: ['Size', 'US', 'UK', 'EU', 'Waist (in)', 'Hip (in)', 'Inseam (in)'],
      rows: [
        ['XS',  '0–2',   '4–6',   '32–34', '23–24', '33–34', '30'],
        ['S',   '4–6',   '8–10',  '36–38', '25–26', '35–36', '30'],
        ['M',   '8–10',  '12–14', '40–42', '27–29', '37–38', '31'],
        ['L',   '12–14', '16–18', '44–46', '30–31', '39–41', '31'],
        ['XL',  '16–18', '20–22', '48–50', '32–34', '42–44', '32'],
        ['XXL', '20–22', '24–26', '52–54', '35–37', '45–47', '32'],
      ],
    },
    'men-tops': {
      headers: ['Size', 'US/UK', 'EU', 'Chest (in)', 'Waist (in)', 'Neck (in)', 'Sleeve (in)'],
      rows: [
        ['XS',  'XS',     '44',   '34–36', '28–30', '13.5', '32–33'],
        ['S',   'S',      '46–48','36–38', '30–32', '14–14.5','33–34'],
        ['M',   'M',      '50–52','38–40', '32–34', '15–15.5','34–35'],
        ['L',   'L',      '54–56','40–42', '34–36', '16–16.5','35–36'],
        ['XL',  'XL',     '58–60','42–44', '36–38', '17–17.5','36–37'],
        ['XXL', 'XXL',    '62–64','44–46', '38–40', '18–18.5','37–38'],
      ],
    },
    'men-bottoms': {
      headers: ['Size', 'Waist (in)', 'Inseam (in)', 'Hip (in)'],
      rows: [
        ['28', '28', '30', '35'],
        ['30', '30', '30', '37'],
        ['32', '32', '31', '39'],
        ['34', '34', '31', '41'],
        ['36', '36', '32', '43'],
        ['38', '38', '32', '45'],
        ['40', '40', '32', '47'],
      ],
    },
    'shoes': {
      headers: ['US Women', 'US Men', 'UK', 'EU', 'Foot Length (in)', 'Foot Length (cm)'],
      rows: [
        ['5',    '3.5',  '2.5', '35–36', '8.5',  '21.6'],
        ['5.5',  '4',    '3',   '36',    '8.75', '22.2'],
        ['6',    '4.5',  '3.5', '36–37', '9',    '22.9'],
        ['6.5',  '5',    '4',   '37',    '9.25', '23.5'],
        ['7',    '5.5',  '4.5', '37–38', '9.5',  '24.1'],
        ['7.5',  '6',    '5',   '38',    '9.75', '24.8'],
        ['8',    '6.5',  '5.5', '38–39', '10',   '25.4'],
        ['8.5',  '7',    '6',   '39',    '10.25','26'],
        ['9',    '7.5',  '6.5', '39–40', '10.5', '26.7'],
        ['9.5',  '8',    '7',   '40',    '10.75','27.3'],
        ['10',   '8.5',  '7.5', '40–41', '11',   '27.9'],
        ['10.5', '9',    '8',   '41',    '11.25','28.6'],
        ['11',   '9.5',  '8.5', '41–42', '11.5', '29.2'],
      ],
    },
  };

  const chart = sizeCharts[activeCategory];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-charcoal-900 to-charcoal-800 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Size Guide</h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">
          Find your perfect fit every time with our comprehensive size charts.
        </p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-cool-gray-500 mb-10">
          <Link href="/" className="hover:text-gold-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-white font-medium">Size Guide</span>
        </nav>

        {/* How to measure */}
        <div className="bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700/40 rounded-2xl p-6 mb-10">
          <h2 className="text-lg font-bold text-charcoal-900 dark:text-white mb-4">📏 How to Measure Yourself</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Bust / Chest', tip: 'Measure around the fullest part of your chest, keeping the tape parallel to the ground.' },
              { label: 'Waist', tip: 'Measure around your natural waistline, the narrowest part of your torso.' },
              { label: 'Hip', tip: 'Stand with feet together. Measure around the fullest part of your hips and seat.' },
              { label: 'Inseam', tip: 'Measure from the crotch down the inside of the leg to the ankle.' },
            ].map((m, i) => (
              <div key={i} className="bg-white dark:bg-charcoal-800 rounded-xl p-4">
                <p className="font-semibold text-charcoal-900 dark:text-white mb-1">{m.label}</p>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{m.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                activeCategory === cat.id
                  ? 'bg-gold-600 text-white shadow-lg'
                  : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-cool-gray-300 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 border border-cool-gray-200 dark:border-charcoal-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Size Table */}
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-sm border border-cool-gray-100 dark:border-charcoal-700 overflow-x-auto mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-charcoal-900 text-white">
                {chart.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t border-cool-gray-100 dark:border-charcoal-700 ${
                    i % 2 === 0 ? 'bg-white dark:bg-charcoal-800' : 'bg-cool-gray-50 dark:bg-charcoal-750'
                  } hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-colors`}
                >
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-3 whitespace-nowrap ${j === 0 ? 'font-bold text-gold-600' : 'text-charcoal-700 dark:text-cool-gray-300'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fit Tips */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: '🤔', title: 'Between Sizes?', tip: 'If you\'re between sizes, we recommend sizing up for a more comfortable fit, especially for structured garments.' },
            { icon: '🧺', title: 'After Washing', tip: 'Natural fabrics like cotton and linen may shrink slightly after washing. Consider this when selecting your size.' },
            { icon: '💬', title: 'Still Unsure?', tip: 'Check the individual product page for specific measurements or contact our team — we\'re happy to help you find the perfect fit.' },
          ].map((tip, i) => (
            <div key={i} className="bg-white dark:bg-charcoal-800 rounded-2xl p-6 shadow-sm border border-cool-gray-100 dark:border-charcoal-700 text-center">
              <div className="text-4xl mb-4">{tip.icon}</div>
              <h3 className="font-bold text-charcoal-900 dark:text-white mb-2">{tip.title}</h3>
              <p className="text-charcoal-600 dark:text-cool-gray-400 text-sm leading-relaxed">{tip.tip}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/shop" className="inline-block px-8 py-3 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 transition-colors mr-4">
            Shop Now
          </Link>
          <Link href="/contact" className="inline-block px-8 py-3 border-2 border-charcoal-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-xl font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-800 transition-colors">
            Need Help?
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
