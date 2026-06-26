import { NextRequest } from 'next/server';
import { User, IUserAddress } from '@/backend/models/User';
import { verifyToken } from '@/backend/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// GET /api/users/me/addresses
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return sendError('Unauthorized', 401);
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return sendError('Invalid token', 401);

  try {
    const user = await User.findById(payload.userId);
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
    const body = await request.json() as Partial<IUserAddress>;
    if (!body.fullName || !body.addressLine1 || !body.city || !body.zipCode) {
      return sendError('fullName, addressLine1, city, and zipCode are required', 400);
    }

    const user = await User.findById(payload.userId);
    if (!user) return sendError('User not found', 404);

    const addresses = user.addresses ? [...user.addresses] : [];

    // If isDefault, demote others
    if (body.isDefault) {
      addresses.forEach((a) => { a.isDefault = false; });
    }

    const newAddress: IUserAddress = {
      id:           Date.now().toString(),
      fullName:     body.fullName,
      phone:        body.phone ?? '',
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city:         body.city,
      state:        body.state ?? '',
      zipCode:      body.zipCode,
      country:      body.country ?? 'United States',
      isDefault:    body.isDefault ?? addresses.length === 0,
    };

    addresses.push(newAddress);
    await User.updateOne(payload.userId, { addresses });

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
    const user = await User.findById(payload.userId);
    if (user) {
      const addresses = (user.addresses || []).filter(a => a.id !== addressId);
      await User.updateOne(payload.userId, { addresses });
    }
    return sendSuccess({}, 'Address removed');
  } catch (err) {
    return sendServerError(err instanceof Error ? err.message : String(err));
  }
}
