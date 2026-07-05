import { NextRequest } from 'next/server';
import { Waitlist } from '@/backend/models/Waitlist';
import { User } from '@/backend/models/User';
import { sendSuccess, sendError, sendServerError } from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      email,
      role,
      
      // Vendor fields
      storeName,
      businessCategory,
      website,
      instagram,
      experienceYears,
      inventorySize,
      city,
      country,

      // Brand fields
      brandName,
      trademarkNumber,
      brandDescription,
      targetAudience,
      yearEstablished,
    } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return sendError('A valid email address is required', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if role is valid
    if (!role || !['vendor', 'brand', 'both'].includes(role)) {
      return sendError('Please select a valid role (Vendor, Brand Owner, or Both)', 400);
    }

    // Check if already registered as a user
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return sendError('This email is already registered on our platform. Please log in instead.', 409);
    }

    // Check if already on the waitlist
    const existingWaitlist = await Waitlist.find({ email: cleanEmail });
    if (existingWaitlist.length > 0) {
      return sendError('This email is already registered on the waitlist.', 409);
    }

    // Save waitlist entry
    const entry = await Waitlist.create({
      name: name || undefined,
      email: cleanEmail,
      role,
      status: 'pending',
      
      // Vendor fields
      storeName: storeName || undefined,
      businessCategory: businessCategory || undefined,
      website: website || undefined,
      instagram: instagram || undefined,
      experienceYears: experienceYears || undefined,
      inventorySize: inventorySize || undefined,
      city: city || undefined,
      country: country || undefined,

      // Brand fields
      brandName: brandName || undefined,
      trademarkNumber: trademarkNumber || undefined,
      brandDescription: brandDescription || undefined,
      targetAudience: targetAudience || undefined,
      yearEstablished: yearEstablished || undefined,
    });

    return sendSuccess(entry, 'Successfully joined the waitlist! We will notify you with launch updates.', 201);
  } catch (error: unknown) {
    console.error('[Waitlist API] Error:', error);
    return sendServerError('An error occurred while joining the waitlist.');
  }
}
