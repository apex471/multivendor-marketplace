import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { Product } from '@/backend/models/Product';
import { sendSuccess, sendServerError } from '@/backend/utils/responseAppRouter';

/**
 * GET /api/store-locator
 * Returns approved vendors and brands that have coordinates set.
 * Falls back to all approved vendors/brands when none have coordinates.
 *
 * Query params:
 *   type=vendor|brand|all   (default: all)
 *   search=string           (name search)
 *   city=string             (city filter)
 *   limit=number            (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sp     = new URL(request.url).searchParams;
    const type   = sp.get('type')   || 'all';
    const search = sp.get('search') || '';
    const city   = sp.get('city')   || '';
    const limit  = Math.min(100, parseInt(sp.get('limit') || '50'));

    const roleFilter =
      type === 'vendor' ? ['vendor'] :
      type === 'brand'  ? ['brand']  :
      ['vendor', 'brand'];

    const filter: Record<string, unknown> = {
      role:              { $in: roleFilter },
      applicationStatus: 'approved',
      isActive:          true,
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { bio:       { $regex: search, $options: 'i' } },
      ];
    }

    // If city provided, search addresses array
    if (city && city !== 'all') {
      filter['addresses.city'] = { $regex: `^${city}$`, $options: 'i' };
    }

    const users = await User.find(filter)
      .select('firstName lastName role avatar bio phoneNumber addresses coordinates createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Bulk product counts
    const userIds = users.map(u => u._id);
    const productCounts = await Product.aggregate([
      { $match: { vendorId: { $in: userIds }, status: 'active' } },
      { $group: { _id: '$vendorId', count: { $sum: 1 }, categories: { $addToSet: '$category' } } },
    ]);
    const countMap = new Map(productCounts.map(r => [String(r._id), { count: r.count as number, categories: r.categories as string[] }]));

    const stores = users.map(u => {
      const defaultAddress = u.addresses?.find((a: { isDefault: boolean }) => a.isDefault) ?? u.addresses?.[0];
      const productInfo = countMap.get(String(u._id));

      return {
        id:       String(u._id),
        name:     `${u.firstName} ${u.lastName}`.trim(),
        type:     u.role as 'vendor' | 'brand',
        category: productInfo?.categories?.[0] ?? (u.role === 'brand' ? 'Brand' : 'General'),
        address:  defaultAddress?.addressLine1 ?? '',
        city:     defaultAddress?.city ?? '',
        state:    defaultAddress?.state ?? '',
        zipCode:  defaultAddress?.zipCode ?? '',
        phone:    u.phoneNumber ?? defaultAddress?.phone ?? '',
        avatar:   u.avatar ?? null,
        bio:      u.bio ?? '',
        products: productInfo?.count ?? 0,
        coordinates: u.coordinates?.lat && u.coordinates?.lng
          ? { lat: u.coordinates.lat, lng: u.coordinates.lng }
          : null,
        joinedAt: u.createdAt,
      };
    });

    // Collect unique cities for the filter dropdown
    const allCities = Array.from(
      new Set(stores.map(s => s.city).filter(Boolean))
    ).sort();

    return sendSuccess({ stores, cities: allCities, total: stores.length });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
