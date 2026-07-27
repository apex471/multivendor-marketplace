import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import { ReferralCode } from '@/backend/models/ReferralCode';
import { db, docToObject } from '@/backend/config/firebase';
import { Transaction } from '@/backend/models/Transaction';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

// GET /api/admin/referrals/[code]/affiliates
// Returns all users who signed up with this referral code, plus per-user earnings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const { code } = await params;
    const sp    = new URL(request.url).searchParams;
    const page  = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, parseInt(sp.get('limit') || '50'));

    // Look up the referral code document
    const refCodeDoc = await ReferralCode.findByCode(code);
    if (!refCodeDoc) return sendError('Referral code not found', 404);

    // Find all users who registered with this code
    const usersSnap = await db
      .collection('users')
      .where('referredByCode', '==', code)
      .get();

    const allUsers = usersSnap.docs.map(d => {
      const u = docToObject<any>(d)!;
      // Strip sensitive fields
      delete u.password;
      delete u.emailVerificationToken;
      delete u.emailVerificationExpires;
      return u;
    });

    // Sort by join date (newest first)
    allUsers.sort((a, b) =>
      (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
      (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    );

    const total    = allUsers.length;
    const paginated = allUsers.slice((page - 1) * limit, page * limit);

    // For each user in the page, pull their affiliate_payout transactions to compute stats
    const enriched = await Promise.all(
      paginated.map(async (user: any) => {
        const txns = await Transaction.find({ type: 'affiliate_payout', affiliateCode: code, toUser: user.id });
        const totalEarnings     = Math.round(txns.reduce((s, t) => s + t.amount, 0) * 100) / 100;
        const totalTransactions = txns.length;
        return {
          id:                 user.id,
          firstName:          user.firstName,
          lastName:           user.lastName,
          email:              user.email,
          role:               user.role,
          avatar:             user.avatar || null,
          joinedAt:           user.createdAt,
          affiliateEarnings:  user.affiliateEarnings || 0,
          totalEarnings,
          totalTransactions,
        };
      })
    );

    // Aggregate totals across ALL users (not just page)
    const allUserIds = allUsers.map((u: any) => u.id);
    let grandTotalEarnings = refCodeDoc.totalEarnings || 0;
    let grandTotalTxns     = refCodeDoc.totalTransactions || 0;

    return sendSuccess({
      code: refCodeDoc,
      affiliates: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        totalAffiliates:    total,
        grandTotalEarnings: Math.round(grandTotalEarnings * 100) / 100,
        grandTotalTxns,
      },
    });
  } catch (err) {
    console.error('[Admin Referrals Affiliates GET]', err);
    return sendServerError('Failed to load affiliates');
  }
}
