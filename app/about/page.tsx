'use client';

import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function AboutPage() {
  const stats = [
    { number: '10,000+', label: 'Active Users' },
    { number: '500+', label: 'Verified Vendors' },
    { number: '50,000+', label: 'Products Listed' },
    { number: '98%', label: 'Customer Satisfaction' },
  ];

  const team = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & CEO',
      image: 'https://i.pravatar.cc/300?u=sarah',
      bio: '15 years in fashion tech',
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      image: 'https://i.pravatar.cc/300?u=michael',
      bio: 'Former tech lead at major e-commerce',
    },
    {
      name: 'Emma Williams',
      role: 'Head of Design',
      image: 'https://i.pravatar.cc/300?u=emma',
      bio: 'Award-winning fashion designer',
    },
    {
      name: 'David Rodriguez',
      role: 'VP of Operations',
      image: 'https://i.pravatar.cc/300?u=david',
      bio: 'Supply chain optimization expert',
    },
  ];

  const values = [
    {
      icon: '🎯',
      title: 'Quality First',
      description: 'We partner only with verified vendors who meet our strict quality standards.',
    },
    {
      icon: '🌱',
      title: 'Sustainability',
      description: 'Promoting eco-friendly fashion and supporting sustainable brands.',
    },
    {
      icon: '🤝',
      title: 'Community',
      description: 'Building a vibrant community where fashion lovers connect and inspire.',
    },
    {
      icon: '💡',
      title: 'Innovation',
      description: 'Constantly evolving to bring you the best shopping and social experience.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-charcoal-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/brand/banner-about.jpg"
            alt="About Certified Luxury World"
            fill
            className="object-cover object-center"
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-charcoal-950/70" />
          <div className="absolute inset-0 bg-linear-to-b from-gold-900/20 via-transparent to-charcoal-950/40" />
        </div>
        <div className="container mx-auto px-4 text-center relative">
          <h1 className="text-5xl font-bold mb-6">About Us</h1>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed text-white/90">
            We're revolutionizing fashion e-commerce by combining marketplace functionality 
            with social media features, creating a unique platform where style meets community.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-4">Our Mission</h2>
            <div className="w-20 h-1 bg-gold-600 mx-auto mb-8"></div>
            <p className="text-lg text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
              To create the world's most engaging fashion marketplace where buyers discover unique styles, 
              vendors grow their businesses, and fashion enthusiasts connect through shared passion for style. 
              We believe shopping should be social, personal, and inspiring.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-charcoal-900 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-gold-600 mb-2">{stat.number}</div>
                <div className="text-charcoal-700 dark:text-cool-gray-300 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-8 text-center">Our Story</h2>
          <div className="space-y-6 text-charcoal-700 dark:text-cool-gray-300 leading-relaxed">
            <p>
              Founded in 2024, our platform was born from a simple observation: online fashion shopping 
              lacked the social connection and inspiration that makes fashion exciting. Traditional 
              e-commerce sites were transactional, while social media platforms weren't designed for shopping.
            </p>
            <p>
              We set out to bridge this gap, creating a platform where you can discover trends through 
              your favorite fashion influencers, shop directly from verified vendors, and share your own 
              style journey with a community that gets it.
            </p>
            <p>
              Today, we're proud to host thousands of fashion enthusiasts, hundreds of verified vendors, 
              and countless inspiring fashion moments. But we're just getting started. Our vision is to 
              become the go-to destination for anyone who loves fashion, whether you're shopping, selling, 
              or simply seeking inspiration.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-100 dark:bg-charcoal-950 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-12 text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md p-6 text-center">
                <div className="text-5xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-3">{value.title}</h3>
                <p className="text-charcoal-600 dark:text-cool-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-12 text-center">Meet Our Team</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <div key={index} className="bg-white dark:bg-charcoal-800 rounded-lg shadow-md overflow-hidden">
              <div className="relative h-64">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-1">{member.name}</h3>
                <p className="text-gold-600 font-semibold mb-2">{member.role}</p>
                <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-white dark:bg-charcoal-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-12 text-center">Our Journey</h2>
          <div className="max-w-3xl mx-auto space-y-8">
            {[
              { year: '2024', title: 'Platform Launch', description: 'Officially launched with 50 vendors and 1,000 products' },
              { year: '2024', title: 'Social Features', description: 'Introduced Stories, Posts, and social feed functionality' },
              { year: '2024', title: 'Mobile App', description: 'Released iOS and Android apps for on-the-go shopping' },
              { year: '2025', title: 'International Expansion', description: 'Expanding to 10 new countries across Europe and Asia' },
            ].map((milestone, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0 w-20 text-right">
                  <div className="text-xl font-bold text-gold-600">{milestone.year}</div>
                </div>
                <div className="flex-shrink-0 w-4 relative">
                  <div className="w-4 h-4 bg-gold-600 rounded-full"></div>
                  {index < 3 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gold-300"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">{milestone.title}</h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-linear-to-r from-gold-600 to-gold-700 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Join Our Fashion Community</h2>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Whether you're here to shop, sell, or share your style, we're excited to have you!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-white text-gold-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Sign Up Now
            </Link>
            <Link
              href="/auth/signup?role=brand"
              className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Become a Vendor
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
