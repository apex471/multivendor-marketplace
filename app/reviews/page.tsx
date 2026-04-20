'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function ReviewsPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const productReviews = [
    {
      id: '1',
      author: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      rating: 5,
      date: 'Dec 10, 2025',
      verified: true,
      text: 'Absolutely love this bag! Quality is exceptional and worth every penny.',
      images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200'],
      helpful: 24,
    },
    {
      id: '2',
      author: 'Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      rating: 4,
      date: 'Dec 8, 2025',
      verified: true,
      text: 'Great product, fast shipping. Only wish it came in more colors.',
      images: [],
      helpful: 12,
    },
  ];

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { alert('Please select a rating.'); return; }
    // Reviews page is a general showcase; redirect user to product for full review
    alert('Thank you for your feedback! Please visit the product page to submit a verified review.');
    setRating(0);
    setReviewText('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-8">Customer Reviews</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Write Review */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-4">Write a Review</h2>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Your Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-3xl transition-transform hover:scale-110"
                      >
                        {star <= (hoverRating || rating) ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-charcoal-700 dark:text-cool-gray-300 font-semibold mb-2">
                    Your Review
                  </label>
                  <textarea
                    rows={5}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full px-4 py-3 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                >
                  Submit Review
                </button>
              </form>
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rating Summary */}
            <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-gold-600 mb-2">4.8</div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-500 text-xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">Based on 127 reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm text-charcoal-600 dark:text-cool-gray-400 w-12">{star} star</span>
                      <div className="flex-1 h-2 bg-cool-gray-200 dark:bg-charcoal-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-600"
                          style={{ width: `${star === 5 ? 75 : star === 4 ? 20 : 3}%` }}
                        />
                      </div>
                      <span className="text-sm text-charcoal-600 dark:text-cool-gray-400 w-8">
                        {star === 5 ? 95 : star === 4 ? 25 : star === 3 ? 5 : 2}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            {productReviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6">
                <div className="flex gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                    <Image src={review.avatar} alt={review.author} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-charcoal-900 dark:text-white">{review.author}</h3>
                          {review.verified && (
                            <span className="text-green-600 text-xs bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-charcoal-600 dark:text-cool-gray-400">{review.date}</p>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-500">⭐</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-charcoal-700 dark:text-cool-gray-300 mb-4">{review.text}</p>
                    {review.images.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {review.images.map((img, index) => (
                          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                            <Image src={img} alt="Review" fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <button className="text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors">
                        👍 Helpful ({review.helpful})
                      </button>
                      <button className="text-charcoal-600 dark:text-cool-gray-400 hover:text-gold-600 transition-colors">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center">
              <button className="px-8 py-3 border-2 border-cool-gray-300 dark:border-charcoal-600 text-charcoal-700 dark:text-cool-gray-300 rounded-lg font-semibold hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors">
                Load More Reviews
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
