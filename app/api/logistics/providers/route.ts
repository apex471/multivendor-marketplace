import { NextRequest } from 'next/server';
import { db, docToObject } from '@/backend/config/firebase';
import { LogisticsProfile } from '@/backend/models/LogisticsProfile';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

function getAuth(req: NextRequest) {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  return tok ? verifyToken(tok) : null;
}

// ─── GET /api/logistics/providers ────────────────────────────────────────────
// Returns all approved logistics providers from Firestore.
// ?online=true  → only providers whose user.isOnline == true
// ?search=       → filter by companyName / coverageAreas
export async function GET(req: NextRequest) {
  try {
    const sp     = new URL(req.url).searchParams;
    const online = sp.get('online') === 'true';
    const search = (sp.get('search') ?? '').toLowerCase();

    // Fetch logistics user accounts
    let userQuery = db.collection('users').where('role', '==', 'logistics') as FirebaseFirestore.Query;
    const userSnap = await userQuery.get();

    if (userSnap.empty) {
      return sendSuccess({ providers: [] });
    }

    const userIds = userSnap.docs.map(d => d.id);

    // Fetch their logistics profiles
    const profiles = await LogisticsProfile.find({});

    // Build a map userId → profile
    const profileMap = new Map<string, typeof profiles[number]>();
    for (const p of profiles) profileMap.set(p.userId, p);

    // Join user + profile into a rich provider object
    const providers = userSnap.docs
      .map(doc => {
        const u       = doc.data();
        const profile = profileMap.get(doc.id);
        return {
          id:                doc.id,
          name:              profile?.companyName ?? u.storeName ?? `${u.firstName} ${u.lastName ?? ''}`.trim(),
          logo:              u.avatar ?? null,
          description:       profile ? `${profile.serviceTypes.join(', ')} · ${profile.city}, ${profile.state}` : 'Logistics provider on CLW',
          coverageArea:      profile?.coverageAreas ?? [],
          estimatedDelivery: profile?.estimatedDelivery ?? 'Varies',
          rating:            (u.rating as number) ?? 4.5,
          totalReviews:      (u.reviewCount as number) ?? 0,
          pricePerKg:        profile?.pricePerKg ?? 0,
          baseFee:           profile?.baseFee ?? 0,
          features:          profile ? [
            ...profile.serviceTypes,
            ...profile.specialCapabilities,
            profile.insuranceCoverage ? `Insured up to $${profile.insuranceCoverage.toLocaleString()}` : null,
            profile.fleetSize ? `Fleet: ${profile.fleetSize}` : null,
          ].filter(Boolean) : [],
          isActive:         u.isActive as boolean ?? true,
          isOnline:         u.isOnline as boolean ?? false,
          contactEmail:     u.email as string,
          contactPhone:     profile?.phone ?? (u.phone as string) ?? '',
          profileId:        profile?.id ?? null,
          licenseNumber:    profile?.licenseNumber ?? null,
          yearsInOperation: profile?.yearsInOperation ?? null,
          city:             profile?.city ?? null,
          state:            profile?.state ?? null,
        };
      })
      .filter(p => {
        if (online && !p.isOnline) return false;
        if (search) {
          const haystack = `${p.name} ${p.description} ${p.coverageArea.join(' ')}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || b.rating - a.rating);

    return sendSuccess({ providers, total: providers.length });
  } catch (err) {
    console.error('[Logistics/Providers GET]', err);
    return sendServerError(err instanceof Error ? err.message : 'Failed to load providers');
  }
}
