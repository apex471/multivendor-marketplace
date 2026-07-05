import { NextRequest } from 'next/server';
import { Waitlist } from '@/backend/models/Waitlist';
import { User, UserRole } from '@/backend/models/User';
import { verifyAdminAuth } from '@/backend/utils/adminAuth';
import {
  sendWaitlistWelcomeEmail,
  sendWaitlistSignupLinkEmail,
  sendWaitlistRejectionEmail,
} from '@/backend/utils/email';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function GET(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const sp = new URL(request.url).searchParams;
    const role = sp.get('role') || 'all';
    const status = sp.get('status') || 'all';
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, parseInt(sp.get('limit') || '20'));

    let entries = await Waitlist.find({}, { orderBy: 'createdAt', orderDir: 'desc', limit: 2000 });

    if (role !== 'all') {
      entries = entries.filter(e => e.role === role);
    }
    if (status !== 'all') {
      entries = entries.filter(e => e.status === status);
    }

    const total = entries.length;
    const paged = entries.slice((page - 1) * limit, page * limit);

    // Get count metrics for stats badges
    const totalEntries = await Waitlist.find({}, { limit: 5000 });
    const pendingCount = totalEntries.filter(e => e.status === 'pending').length;
    const approvedCount = totalEntries.filter(e => e.status === 'approved').length;
    const rejectedCount = totalEntries.filter(e => e.status === 'rejected').length;
    const linkSentCount = totalEntries.filter(e => e.status === 'link_sent').length;

    return sendSuccess({
      entries: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        linkSent: linkSentCount,
        total,
      },
    });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

export async function POST(request: NextRequest) {
  const { error } = await verifyAdminAuth(request);
  if (error) return sendError(error, 401);

  try {
    const body = await request.json().catch(() => ({}));
    const { entryId, action, notes, approvedRole } = body;

    if (!entryId) return sendError('entryId is required', 400);
    if (!['approve', 'send_link', 'reject'].includes(action)) {
      return sendError('action must be "approve", "send_link", or "reject"', 400);
    }

    const entry = await Waitlist.findById(entryId);
    if (!entry) return sendError('Waitlist entry not found', 404);

    // 1. APPROVE ACTION
    if (action === 'approve') {
      // Determine which role to register the user as
      const finalRole = approvedRole || (entry.role === 'both' ? 'vendor' : entry.role);
      if (!['vendor', 'brand'].includes(finalRole)) {
        return sendError('A valid role selection (vendor or brand) is required to approve', 400);
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: entry.email });
      if (existingUser) {
        return sendError('User with this email already exists in users database.', 409);
      }

      // Parse first/last name
      let firstName = 'Waitlist';
      let lastName = 'Member';
      if (entry.name) {
        const parts = entry.name.trim().split(/\s+/);
        if (parts.length > 0) firstName = parts[0];
        if (parts.length > 1) lastName = parts.slice(1).join(' ');
      }

      // Generate a temporary password
      const tempPassword = `CLW-Welcome-${Math.random().toString(36).slice(-8)}`;

      // Create new user account with waitlist details
      await User.create({
        firstName,
        lastName,
        email: entry.email,
        password: tempPassword,
        role: finalRole as UserRole,
        applicationStatus: 'approved',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: false,
        
        // Vendor info
        ...(finalRole === 'vendor' ? {
          storeName: entry.storeName,
          businessDescription: entry.brandDescription,
          website: entry.website,
        } : {}),

        // Brand info
        ...(finalRole === 'brand' ? {
          storeName: entry.brandName || entry.storeName,
          businessDescription: entry.brandDescription,
          website: entry.website,
        } : {}),
      });

      // Send waitlist approval email
      await sendWaitlistWelcomeEmail({
        email: entry.email,
        name: entry.name || firstName,
        role: finalRole as 'vendor' | 'brand',
        tempPassword,
        notes: notes || undefined,
      });

      // Update waitlist entry
      await Waitlist.updateOne(entryId, {
        status: 'approved',
        adminNotes: notes || `Approved as ${finalRole} by administrator.`,
      });

      return sendSuccess({ id: entryId, status: 'approved' }, `Application approved successfully. User account created as a ${finalRole}.`);
    }

    // 2. SEND LIVE SIGNUP LINK ACTION
    if (action === 'send_link') {
      const finalRole = approvedRole || (entry.role === 'both' ? 'vendor' : entry.role);
      
      await sendWaitlistSignupLinkEmail({
        email: entry.email,
        name: entry.name || 'Waitlist Member',
        role: finalRole as 'vendor' | 'brand',
        notes: notes || undefined,
      });

      await Waitlist.updateOne(entryId, {
        status: 'link_sent',
        adminNotes: notes || `Registration link sent for ${finalRole} role.`,
      });

      return sendSuccess({ id: entryId, status: 'link_sent' }, 'Live registration link sent successfully.');
    }

    // 3. REJECT ACTION
    if (action === 'reject') {
      const finalRole = approvedRole || (entry.role === 'both' ? 'vendor' : entry.role);

      await sendWaitlistRejectionEmail({
        email: entry.email,
        name: entry.name || 'Waitlist Member',
        role: finalRole as 'vendor' | 'brand',
        notes: notes || undefined,
      });

      await Waitlist.updateOne(entryId, {
        status: 'rejected',
        adminNotes: notes || 'Application rejected.',
      });

      return sendSuccess({ id: entryId, status: 'rejected' }, 'Application rejected successfully.');
    }

    return sendError('Invalid action', 400);
  } catch (err) {
    console.error('[Admin Waitlist API] Error:', err);
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
