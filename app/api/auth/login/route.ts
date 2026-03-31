import { NextRequest } from 'next/server';
import { connectDB } from '@/backend/config/database';
import { User } from '@/backend/models/User';
import { generateToken } from '@/backend/utils/jwt';
import { validateLoginInput } from '@/backend/utils/validation';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Validate input
    const validation = validateLoginInput(body);
    if (!validation.isValid) {
      return sendValidationError('Validation failed', validation.errors);
    }

    const email: string = body.email.toLowerCase().trim();
    const password: string = body.password;

    await connectDB();

    // Find user with password field (excluded by default)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Same error for both "not found" and "wrong password" to prevent email enumeration
      return sendError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      return sendError('Your account has been deactivated. Please contact support.', 403);
    }

    // Vendors, brands, and logistics must verify their email before logging in
    const rolesRequiringVerification = ['vendor', 'brand', 'logistics'];
    if (rolesRequiringVerification.includes(user.role) && !user.isEmailVerified) {
      return sendError(
        'Please verify your email address before logging in. Check your inbox for a verification link.',
        403,
        { requiresEmailVerification: 'true', email: user.email }
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendError('Invalid email or password', 401);
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString(), user.email, user.role);

    return sendSuccess(
      {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          isEmailVerified: user.isEmailVerified,
        },
        token,
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login route error:', error);
    return sendServerError('An error occurred during login');
  }
}
