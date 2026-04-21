'use client';

import { useState } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function ReviewsPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewMsg, setReviewMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setReviewMsg({ type: 'error', text: 'Please select a rating.' }); return; }
    // Reviews page is a general showcase; direct users to the product page for verified reviews
    setReviewMsg({ type: 'success', text: 'Thank you! Please visit the specific product page to submit a verified review.' });
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

                {reviewMsg && (
                  <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                    reviewMsg.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  }`}>
                    {reviewMsg.text}
                  </div>
                )}
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
              {/* Notice */}
              <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-md p-6">
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">⭐</div>
                  <h2 className="text-xl font-bold text-charcoal-900 dark:text-white mb-3">Reviews are on Product Pages</h2>
                  <p className="text-charcoal-600 dark:text-cool-gray-400 mb-6 max-w-md mx-auto">
                    Verified customer reviews live on each individual product page. Browse our catalogue to read and submit reviews for items you&apos;ve purchased.
                  </p>
                  <a href="/shop" className="inline-block px-6 py-3 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors">
                    Browse Products
                  </a>
                </div>
              </div>
            </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
