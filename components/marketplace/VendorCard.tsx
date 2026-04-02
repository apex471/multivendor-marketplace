import Image from 'next/image';
import Link from 'next/link';
import type { Vendor } from '../../types';

interface VendorCardProps {
  vendor: Vendor;
  distance?: number; // in km
}

export default function VendorCard({ vendor, distance }: VendorCardProps) {
  return (
    <Link href={`/vendors/${vendor.id}`} className="group">
      <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
        {/* Store Banner */}
        <div className="relative h-32 bg-linear-to-r from-primary-400 to-secondary-400">
          {vendor.storeBanner && (
            <Image
              src={vendor.storeBanner}
              alt={vendor.storeName}
              fill
              className="object-cover"
            />
          )}
        </div>

        {/* Store Info */}
        <div className="relative px-4 pb-4">
          {/* Store Logo */}
          <div className="absolute -top-12 left-4">
            <div className="w-20 h-20 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
              {vendor.storeLogo ? (
                <Image
                  src={vendor.storeLogo}
                  alt={vendor.storeName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl">
                  🏪
                </div>
              )}
            </div>
          </div>

          <div className="pt-10">
            {/* Verified Badge */}
            {vendor.isVerified && (
              <div className="flex justify-end mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  ✓ Verified
                </span>
              </div>
            )}

            {/* Store Name */}
            <h3 className="font-display font-bold text-lg text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
              {vendor.storeName}
            </h3>

            {/* Store Description */}
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {vendor.storeDescription}
            </p>

            {/* Categories */}
            <div className="flex flex-wrap gap-1 mb-3">
              {vendor.categories.slice(0, 3).map((category: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {category}
                </span>
              ))}
              {vendor.categories.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  +{vendor.categories.length - 3}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                <span className="font-medium text-gray-700">{vendor.rating.toFixed(1)}</span>
                <span className="text-gray-500">({vendor.totalReviews})</span>
              </div>

              {distance !== undefined && (
                <div className="flex items-center gap-1 text-gray-600">
                  <span>📍</span>
                  <span>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="mt-2 text-sm text-gray-500">
              📍 {vendor.location.city}, {vendor.location.state}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
