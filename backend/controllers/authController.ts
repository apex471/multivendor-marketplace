import { NextApiResponse } from 'next';
import { User, UserRole } from '../models/User';
import { generateToken } from '../utils/jwt';
import {
  validateSignupInput,
  validateLoginInput,
  sanitizeInput,
} from '../utils/validation';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendServerError,
  sendNotFound,
} from '../utils/response';

/**
 * Sign up a new user
 */
export async function signup(
  req: any,
  res: NextApiResponse,
  data: any
) {
  try {
    // Validate input
    const validation = validateSignupInput(data);
    if (!validation.isValid) {
      sendValidationError(res, validation.errors);
      return;
    }

    // Sanitize input
    const firstName = sanitizeInput(data.firstName);
    const lastName = sanitizeInput(data.lastName);
    const email = data.email.toLowerCase().trim();
    const password = data.password;
    const role = data.role || UserRole.CUSTOMER;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      sendError(
        res,
        'User with this email already exists',
        { email: 'Email is already registered' },
        409
      );
      return;
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber: data.phoneNumber || undefined,
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id.toString(), newUser.email, newUser.role);

    // Return success response
    sendSuccess(
      res,
      'Signup successful',
      {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar,
        },
        token,
      },
      201
    );
  } catch (error) {
    console.error('Signup error:', error);
    sendServerError(res, 'An error occurred during signup', error);
  }
}

/**
 * Login user
 */
export async function login(
  req: any,
  res: NextApiResponse,
  data: any
) {
  try {
    // Validate input
    const validation = validateLoginInput(data);
    if (!validation.isValid) {
      sendValidationError(res, validation.errors);
      return;
    }

    const email = data.email.toLowerCase().trim();
    const password = data.password;

    // Find user by email (need to select password explicitly)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      sendError(
        res,
        'Invalid email or password',
        { credentials: 'Invalid email or password' },
        401
      );
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      sendError(
        res,
        'Your account has been deactivated',
        { account: 'Account is inactive' },
        403
      );
      return;
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      sendError(
        res,
        'Invalid email or password',
        { credentials: 'Invalid email or password' },
        401
      );
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString(), user.email, user.role);

    // Return success response
    sendSuccess(res, 'Login successful', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    sendServerError(res, 'An error occurred during login', error);
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(
  req: any,
  res: NextApiResponse,
  userId: string
) {
  try {
    const user = await User.findById(userId);

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, 'User profile retrieved successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    sendServerError(res, 'An error occurred while fetching user profile', error);
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  req: any,
  res: NextApiResponse,
  userId: string,
  data: any
) {
  try {
    const updateData: any = {};

    // Only allow specific fields to be updated
    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'bio', 'avatar'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'firstName' || field === 'lastName') {
          updateData[field] = sanitizeInput(data[field]);
        } else {
          updateData[field] = data[field];
        }
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, 'Profile updated successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    sendServerError(res, 'An error occurred while updating profile', error);
  }
}

/**
 * Change password
 */
export async function changePassword(
  req: any,
  res: NextApiResponse,
  userId: string,
  data: any
) {
  try {
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      sendValidationError(res, {
        currentPassword: 'Current password is required',
        newPassword: 'New password is required',
        confirmPassword: 'Password confirmation is required',
      });
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      sendValidationError(res, {
        confirmPassword: 'Passwords do not match',
      });
      return;
    }

    // Find user and get password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(data.currentPassword);

    if (!isPasswordValid) {
      sendError(
        res,
        'Current password is incorrect',
        { currentPassword: 'Current password is incorrect' },
        401
      );
      return;
    }

    // Update password
    user.password = data.newPassword;
    await user.save();

    sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    sendServerError(res, 'An error occurred while changing password', error);
  }
}
