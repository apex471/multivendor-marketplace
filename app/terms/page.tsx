'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing and using this platform, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.`,
    },
    {
      title: '2. User Accounts',
      content: `You must register for an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.`,
    },
    {
      title: '3. User Conduct',
      content: `You agree not to:
• Post content that is illegal, harmful, threatening, abusive, harassing, or offensive
• Impersonate any person or entity
• Violate any intellectual property rights
• Engage in fraudulent activities or scams
• Spam or harass other users
• Attempt to gain unauthorized access to the platform
• Use automated systems to access the service without permission`,
    },
    {
      title: '4. Vendor Terms',
      content: `Vendors must:
• Provide accurate information about their products
• Honor all sales made through the platform
• Comply with all applicable laws and regulations
• Pay applicable fees and commissions (10% per sale)
• Maintain adequate inventory
• Provide customer service for their products
• Not sell counterfeit or prohibited items`,
    },
    {
      title: '5. Product Listings',
      content: `All product listings must:
• Contain accurate descriptions and images
• Include correct pricing and availability
• Comply with our content policies
• Not infringe on intellectual property rights
• Not contain prohibited items (weapons, drugs, counterfeit goods, etc.)

We reserve the right to remove any listing that violates these terms.`,
    },
    {
      title: '6. Purchases and Payments',
      content: `By making a purchase, you agree to:
• Provide accurate payment and shipping information
• Pay the listed price plus applicable taxes and shipping
• Our return and refund policy as stated
• Resolve disputes directly with vendors when possible

All payments are processed securely through our payment partners.`,
    },
    {
      title: '7. Shipping and Delivery',
      content: `Shipping times and costs vary by vendor and location. We are not responsible for delays caused by shipping carriers, customs, or other factors beyond our control. Risk of loss passes to you upon delivery to the carrier.`,
    },
    {
      title: '8. Returns and Refunds',
      content: `Our 30-day return policy allows returns on most items. Items must be:
• Unused and in original condition
• In original packaging with tags attached
• Returned within 30 days of delivery

Refunds are processed within 5-7 business days after we receive the return. Some items may not be eligible for return (final sale, personalized items, intimate apparel).`,
    },
    {
      title: '9. Intellectual Property',
      content: `All content on this platform, including text, graphics, logos, images, and software, is the property of our company or our content suppliers and is protected by copyright and trademark laws. You may not use, reproduce, or distribute any content without permission.`,
    },
    {
      title: '10. User Content',
      content: `By posting content (posts, comments, reviews, photos), you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content on our platform. You retain ownership of your content but agree we may use it for promotional purposes.

You represent that you own or have rights to any content you post.`,
    },
    {
      title: '11. Privacy and Data',
      content: `Your use of this service is also governed by our Privacy Policy. We collect, use, and protect your personal information as described in that policy. By using our service, you consent to our data practices.`,
    },
    {
      title: '12. Disclaimers',
      content: `This service is provided "as is" without warranties of any kind, either express or implied. We do not guarantee:
• Uninterrupted or error-free service
• The accuracy of product listings
• The quality of products sold by vendors
• That the service will meet your requirements

We are not responsible for disputes between buyers and vendors.`,
    },
    {
      title: '13. Limitation of Liability',
      content: `To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangibles, resulting from:
• Your use or inability to use the service
• Unauthorized access to your account
• Third-party content or conduct
• Product defects or merchant disputes`,
    },
    {
      title: '14. Indemnification',
      content: `You agree to indemnify and hold us harmless from any claims, damages, losses, liabilities, and expenses arising from:
• Your violation of these terms
• Your violation of any rights of another person or entity
• Your use of the service`,
    },
    {
      title: '15. Termination',
      content: `We may suspend or terminate your account at any time for violations of these terms or for any other reason. Upon termination, your right to use the service will immediately cease. Provisions that by their nature should survive termination shall survive.`,
    },
    {
      title: '16. Changes to Terms',
      content: `We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification. Your continued use of the service after changes constitutes acceptance of the modified terms.`,
    },
    {
      title: '17. Governing Law',
      content: `These terms shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to its conflict of law provisions.`,
    },
    {
      title: '18. Dispute Resolution',
      content: `Any disputes arising from these terms or your use of the service shall be resolved through binding arbitration in accordance with the American Arbitration Association rules. You waive your right to a jury trial or to participate in a class action.`,
    },
    {
      title: '19. Contact Information',
      content: `For questions about these terms, please contact us at:
Email: legal@fashionmarketplace.com
Address: 123 Fashion Avenue, New York, NY 10001`,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl font-bold text-charcoal-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-charcoal-600 dark:text-cool-gray-400 mb-2">
            <strong>Last Updated:</strong> December 18, 2025
          </p>
          <p className="text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
            Please read these Terms of Service carefully before using our platform. By accessing or using our service, 
            you agree to be bound by these terms. If you disagree with any part of these terms, you may not access the service.
          </p>
        </div>

        {/* Quick Links */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Quick Links</h2>
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

        {/* Terms Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <div key={index} id={`section-${index}`} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white mb-4">{section.title}</h2>
              <div className="text-charcoal-700 dark:text-cool-gray-300 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Agreement Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-linear-to-r from-gold-600 to-gold-700 rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Have Questions?</h2>
            <p className="mb-6">
              If you have any questions about these Terms of Service, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-8 py-3 bg-white text-gold-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/privacy"
                className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
