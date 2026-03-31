'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';

interface GoogleSignupProps {
  onSuccess?: () => void;
  onError?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export default function GoogleSignupButton({
  onSuccess,
  onError,
  className = '',
  variant = 'default',
}: GoogleSignupProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);

      if (!credentialResponse.credential) {
        alert('Failed to get Google credential');
        onError?.();
        return;
      }

      // Send Google token to backend for signup/signin
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Google signup failed');
        onError?.();
        return;
      }

      // Store token and user info
      if (data.data?.token) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        alert('Account created successfully with Google!');
        onSuccess?.();

        // Redirect to dashboard or home page after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Google signup error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
      onError?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    alert('Google signup failed. Please try again.');
    onError?.();
  };

  return (
    <div className={className}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />
    </div>
  );
}
