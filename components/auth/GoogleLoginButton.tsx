'use client';

import React from 'react';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  className = '',
  variant = 'default',
}: GoogleLoginButtonProps) {
  const { googleLogin, isLoading } = useAuth();
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setLocalError(null);

    if (!credentialResponse.credential) {
      setLocalError('Failed to receive Google credential. Please try again.');
      onError?.();
      return;
    }

    // Delegate everything (API call + state update + storage) to AuthContext
    const success = await googleLogin(credentialResponse.credential);

    if (success) {
      onSuccess?.();
    } else {
      setLocalError('Google sign-in failed. Please try again.');
      onError?.();
    }
  };

  const handleGoogleError = () => {
    setLocalError('Google sign-in was cancelled or failed. Please try again.');
    onError?.();
  };

  return (
    <div className={className}>
      {localError && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{localError}</span>
        </div>
      )}

      <div className={isLoading ? 'opacity-60 pointer-events-none' : ''}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme="outline"
          size={variant === 'compact' ? 'medium' : 'large'}
          width="100%"
          text="signin_with"
          shape="rectangular"
        />
      </div>
    </div>
  );
}
