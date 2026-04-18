'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function VendorDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/vendor'); }, [router]);
  return null;
}
