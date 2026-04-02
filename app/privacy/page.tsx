'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: `We collect several types of information to provide and improve our service:

**Personal Information:**
• Name, email address, phone number
• Shipping and billing addresses
• Payment information (processed securely by our payment partners)
• Date of birth (for age verification)

**Profile Information:**
• Username, profile photo, bio
• Social media links
• Fashion preferences and interests

**User Content:**
• Posts, comments, reviews
• Photos and videos you upload
• Messages and communications

**Automatically Collected Information:**
• IP address, browser type, device information
• Pages visited, time spent on pages
• Referral sources, search terms
• Cookies and similar tracking technologies`,
    },
    {
      title: '2. How We Use Your Information',
      content: `We use collected information for various purposes:

• **Service Delivery:** Process orders, manage accounts, provide customer support
• **Personalization:** Customize your experience, recommend products
• **Communication:** Send order updates, promotional emails, notifications
• **Security:** Prevent fraud, protect against security threats
• **Analytics:** Understand how users interact with our platform
• **Marketing:** Send relevant offers and promotions (with your consent)
• **Legal Compliance:** Comply with laws and regulations
• **Improvement:** Develop new features and improve existing ones`,
    },
    {
      title: '3. How We Share Your Information',
      content: `We may share your information with:

**Vendors:**
• Sellers receive your name, shipping address, and order details to fulfill purchases

**Service Providers:**
• Payment processors (Stripe, PayPal)
• Shipping carriers (USPS, FedEx, UPS)
• Cloud storage providers (AWS, Google Cloud)
• Analytics services (Google Analytics)
• Email service providers

**Business Transfers:**
• In case of merger, acquisition, or asset sale, user data may be transferred

**Legal Requirements:**
• When required by law or to protect rights and safety
• In response to legal processes or government requests

**With Your Consent:**
• Any other sharing will be done only with your explicit consent

We do NOT sell your personal information to third parties.`,
    },
    {
      title: '4. Cookies and Tracking',
      content: `We use cookies and similar technologies to:

**Essential Cookies:**
• Enable core functionality like shopping cart and login
• Required for the platform to work properly

**Analytics Cookies:**
• Understand how visitors use our site
• Help us improve user experience

**Marketing Cookies:**
• Deliver personalized advertisements
• Track campaign effectiveness

**Social Media Cookies:**
• Enable social sharing features
• Connect with social media platforms

You can control cookies through your browser settings. Note that disabling cookies may limit functionality.`,
    },
    {
      title: '5. Data Security',
      content: `We implement security measures to protect your information:

• **Encryption:** All data transmitted is encrypted using SSL/TLS
• **Secure Storage:** Data stored on secure servers with access controls
• **Payment Security:** We never store complete credit card numbers
• **Regular Audits:** Security practices reviewed regularly
• **Employee Training:** Staff trained on data protection
• **Access Controls:** Limited access to personal information

However, no internet transmission is 100% secure. We cannot guarantee absolute security.`,
    },
    {
      title: '6. Your Rights and Choices',
      content: `You have several rights regarding your personal information:

**Access:** Request a copy of your personal data
**Correction:** Update or correct inaccurate information
**Deletion:** Request deletion of your account and data
**Portability:** Receive your data in a portable format
**Opt-Out:** Unsubscribe from marketing emails
**Do Not Track:** Configure browser DNT settings
**Cookie Control:** Manage cookie preferences

To exercise these rights, visit your account settings or contact us at privacy@fashionmarketplace.com.`,
    },
    {
      title: '7. Data Retention',
      content: `We retain your information for as long as necessary to:

• Provide our services
• Comply with legal obligations
• Resolve disputes and enforce agreements

**Active Accounts:** Data retained while account is active
**Closed Accounts:** Some data retained for legal/business purposes
**Marketing Data:** Retained until you opt-out
**Transaction Records:** Retained for 7 years per legal requirements

You can request data deletion at any time, subject to legal obligations.`,
    },
    {
      title: '8. Children\'s Privacy',
      content: `Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13 without parental consent, we will take steps to delete that information.

If you believe we have collected information from a child under 13, please contact us immediately.`,
    },
    {
      title: '9. International Data Transfers',
      content: `Your information may be transferred to and maintained on servers located outside your country where data protection laws may differ. By using our service, you consent to this transfer.

We ensure appropriate safeguards are in place for international transfers, including:
• Standard Contractual Clauses
• Privacy Shield frameworks (where applicable)
• Other legally approved mechanisms`,
    },
    {
      title: '10. Third-Party Links',
      content: `Our platform may contain links to third-party websites, social media platforms, or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing any information.`,
    },
    {
      title: '11. California Privacy Rights',
      content: `California residents have additional rights under CCPA:

• Right to know what personal information is collected
• Right to know if personal information is sold or disclosed
• Right to opt-out of the sale of personal information
• Right to deletion of personal information
• Right to non-discrimination for exercising CCPA rights

We do not sell personal information. To exercise your rights, contact us at privacy@fashionmarketplace.com.`,
    },
    {
      title: '12. GDPR Rights (EU Users)',
      content: `If you are in the European Economic Area, you have rights under GDPR:

• Right of access to your personal data
• Right to rectification of inaccurate data
• Right to erasure ("right to be forgotten")
• Right to restrict processing
• Right to data portability
• Right to object to processing
• Rights related to automated decision-making

Contact our Data Protection Officer at dpo@fashionmarketplace.com.`,
    },
    {
      title: '13. Changes to Privacy Policy',
      content: `We may update this Privacy Policy from time to time. When we make significant changes, we will:

• Post the updated policy on this page
• Update the "Last Updated" date
• Notify you via email or platform notification
• Request your consent if required by law

Your continued use after changes constitutes acceptance of the updated policy.`,
    },
    {
      title: '14. Contact Us',
      content: `For questions or concerns about this Privacy Policy or our data practices:

**Email:** privacy@fashionmarketplace.com
**Mail:** Privacy Team, 123 Fashion Avenue, New York, NY 10001
**Phone:** +1 (234) 567-890

**Data Protection Officer:**
Email: dpo@fashionmarketplace.com

We will respond to your inquiry within 30 days.`,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl font-bold text-charcoal-900 mb-4">Privacy Policy</h1>
          <p className="text-charcoal-600 mb-2">
            <strong>Last Updated:</strong> December 18, 2025
          </p>
          <p className="text-charcoal-700 leading-relaxed">
            This Privacy Policy describes how we collect, use, and protect your personal information when you use our 
            fashion marketplace and social platform. We are committed to protecting your privacy and being transparent 
            about our data practices.
          </p>
        </div>

        {/* Quick Summary */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-linear-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600 rounded-lg p-6">
            <h2 className="text-xl font-bold text-charcoal-900 mb-4">📋 Quick Summary</h2>
            <ul className="space-y-2 text-charcoal-700">
              <li>✅ We collect information to provide and improve our services</li>
              <li>✅ We do NOT sell your personal information</li>
              <li>✅ You can access, update, or delete your data anytime</li>
              <li>✅ We use industry-standard security measures</li>
              <li>✅ You can opt-out of marketing emails</li>
              <li>✅ Cookies can be controlled through your browser</li>
            </ul>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-charcoal-900 mb-4">Table of Contents</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {sections.map((section, index) => (
                <a
                  key={index}
                  href={`#section-${index}`}
                  className="text-gold-600 hover:text-gold-700 font-medium text-sm"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <div key={index} id={`section-${index}`} className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-charcoal-900 mb-4">{section.title}</h2>
              <div className="text-charcoal-700 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Privacy Certifications */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-charcoal-900 mb-6 text-center">
              Our Privacy Commitments
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-5xl mb-3">🔒</div>
                <h3 className="font-bold text-charcoal-900 mb-2">SSL Encrypted</h3>
                <p className="text-sm text-charcoal-600">All data transmission secured</p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🛡️</div>
                <h3 className="font-bold text-charcoal-900 mb-2">GDPR Compliant</h3>
                <p className="text-sm text-charcoal-600">EU data protection standards</p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="font-bold text-charcoal-900 mb-2">CCPA Compliant</h3>
                <p className="text-sm text-charcoal-600">California privacy rights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-linear-to-r from-gold-600 to-gold-700 rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Privacy Questions?</h2>
            <p className="mb-6">
              We're here to help you understand how we protect your information.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-8 py-3 bg-white text-gold-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Contact Privacy Team
              </Link>
              <Link
                href="/settings"
                className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Manage Privacy Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
