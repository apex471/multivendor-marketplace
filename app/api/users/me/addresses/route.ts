import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

interface AddressEntry {
  id:           string;
  fullName:     string;
  phone:        string;
  addressLine1: string;
  addressLine2?: string;
  city:         string;
  state:        string;
  zipCode:      string;
  country:      string;
  isDefault:    boolean;
}

// GET /api/users/me/addresses
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    await connectDB();
    const user = await User.findById(payload.userId).select('addresses').lean() as any;
    return sendSuccess({ addresses: user?.addresses ?? [] });
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// POST /api/users/me/addresses — add a new address
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const body = await request.json() as Partial<AddressEntry>;
    if (!body.fullName || !body.addressLine1 || !body.city || !body.zipCode) {
      return sendError('fullName, addressLine1, city, and zipCode are required', 400);
    }

    await connectDB();
    const user = await User.findById(payload.userId) as any;
    if (!user) return sendError('User not found', 404);

    if (!user.addresses) user.addresses = [];

    // If isDefault, demote others
    if (body.isDefault) {
      user.addresses.forEach((a: any) => { a.isDefault = false; });
    }

    const newAddress = {
      id:           Date.now().toString(),
      fullName:     body.fullName,
      phone:        body.phone ?? '',
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city:         body.city,
      state:        body.state ?? '',
      zipCode:      body.zipCode,
      country:      body.country ?? 'United States',
      isDefault:    body.isDefault ?? user.addresses.length === 0,
    };

    user.addresses.push(newAddress);
    await user.save();

    return sendSuccess({ address: newAddress }, 'Address saved', 201);
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}

// DELETE /api/users/me/addresses?id=xxx
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  const addressId = new URL(request.url).searchParams.get('id');
  if (!addressId) return sendError('id param required', 400);

  try {
    await connectDB();
    await User.updateOne(
      { _id: payload.userId },
      { $pull: { addresses: { id: addressId } } } as any
    );
    return sendSuccess({}, 'Address removed');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
