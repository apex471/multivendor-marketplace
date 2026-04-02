'use client';

import { useState } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    console.log('Contact form submitted:', formData);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: '',
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-charcoal-900 mb-4">Contact Us</h1>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Have a question or need assistance? We're here to help! Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-6">✅</div>
                  <h2 className="text-2xl font-bold text-charcoal-900 mb-4">
                    Message Sent Successfully!
                  </h2>
                  <p className="text-charcoal-600 mb-8">
                    Thank you for contacting us. We'll respond to your inquiry within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-charcoal-900 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-charcoal-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900"
                        placeholder="john@example.com"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-semibold text-charcoal-900 mb-2">
                        Category *
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="orders">Orders & Shipping</option>
                        <option value="returns">Returns & Refunds</option>
                        <option value="products">Product Questions</option>
                        <option value="technical">Technical Support</option>
                        <option value="vendor">Vendor Inquiries</option>
                        <option value="partnership">Partnership Opportunities</option>
                        <option value="press">Press & Media</option>
                      </select>
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-charcoal-900 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900"
                        placeholder="How can we help you?"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-charcoal-900 mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600 focus:border-transparent text-charcoal-900 resize-none"
                        placeholder="Please provide as much detail as possible..."
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-6 py-4 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Email */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-2">Email Us</h3>
              <p className="text-charcoal-600 mb-3">
                Get help from our support team
              </p>
              <a
                href="mailto:support@fashionmarketplace.com"
                className="text-gold-600 hover:text-gold-700 font-semibold"
              >
                support@fashionmarketplace.com
              </a>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-2">Call Us</h3>
              <p className="text-charcoal-600 mb-3">
                Mon-Fri, 9am-6pm EST
              </p>
              <a
                href="tel:+1234567890"
                className="text-gold-600 hover:text-gold-700 font-semibold"
              >
                +1 (234) 567-890
              </a>
            </div>

            {/* Office */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-2">Visit Us</h3>
              <p className="text-charcoal-600 leading-relaxed">
                123 Fashion Avenue<br />
                New York, NY 10001<br />
                United States
              </p>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-3">Follow Us</h3>
              <div className="flex gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gold-600 hover:text-white transition-colors text-xl"
                >
                  📘
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gold-600 hover:text-white transition-colors text-xl"
                >
                  🐦
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gold-600 hover:text-white transition-colors text-xl"
                >
                  📷
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gold-600 hover:text-white transition-colors text-xl"
                >
                  💼
                </a>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-linear-to-br from-gold-600 to-gold-700 rounded-lg p-6 text-white">
              <div className="text-4xl mb-3">⏱️</div>
              <h3 className="text-xl font-bold mb-2">Response Time</h3>
              <p className="text-sm">
                We typically respond within 24 hours during business days. For urgent matters, please call us directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
