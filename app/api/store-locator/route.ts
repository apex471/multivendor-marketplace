import { NextRequest } from 'next/server';
import { User } from '@/backend/models/User';
import { db, docToObject } from '@/backend/config/firebase';
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
    const sp     = new URL(request.url).searchParams;
    const type   = sp.get('type')   || 'all';
    const search = sp.get('search') || '';
    const city   = sp.get('city')   || '';
    const limit  = Math.min(100, parseInt(sp.get('limit') || '50'));

    const roleFilter =
      type === 'vendor' ? ['vendor'] :
      type === 'brand'  ? ['brand']  :
      ['vendor', 'brand'];

    let allUsers = await User.find({
      isActive:          true,
      applicationStatus: 'approved',
    });

    // Filter by role
    allUsers = allUsers.filter(u => roleFilter.includes(u.role));

    if (search) {
      const lower = search.toLowerCase();
      allUsers = allUsers.filter(u =>
        u.firstName.toLowerCase().includes(lower) ||
        (u.lastName && u.lastName.toLowerCase().includes(lower)) ||
        (u.bio && u.bio.toLowerCase().includes(lower))
      );
    }

    // If city provided, search addresses array
    if (city && city !== 'all') {
      const lowerCity = city.toLowerCase();
      allUsers = allUsers.filter(u =>
        u.addresses?.some(a => a.city.toLowerCase() === lowerCity)
      );
    }

    // Sort by newest
    allUsers.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    const paginated = allUsers.slice(0, limit);

    // Bulk product counts & categories
    const userIds = paginated.map(u => u.id!).filter(Boolean);
    const countMap = new Map<string, { count: number; categories: string[] }>();
    
    if (userIds.length > 0) {
      const snap = await db.collection('products')
        .where('status', '==', 'active')
        .where('vendorId', 'in', userIds)
        .get();
      snap.docs.forEach(d => {
        const data = d.data();
        const vId = data.vendorId;
        const cat = data.category as string;
        if (vId) {
          const info = countMap.get(vId) ?? { count: 0, categories: [] };
          info.count += 1;
          if (cat && !info.categories.includes(cat)) {
            info.categories.push(cat);
          }
          countMap.set(vId, info);
        }
      });
    }

    const stores = paginated.map(u => {
      const defaultAddress = u.addresses?.find((a: any) => a.isDefault) ?? u.addresses?.[0];
      const productInfo = countMap.get(String(u.id));

      return {
        id:       String(u.id),
        name:     `${u.firstName} ${u.lastName ?? ''}`.trim(),
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
