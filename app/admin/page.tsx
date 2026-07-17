'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/database/mockDb';
import { canAccessAdminPortal } from '@/lib/rbac';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser && canAccessAdminPortal(currentUser.role)) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [router]);

  return null;
}
