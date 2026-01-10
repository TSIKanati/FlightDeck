'use client';

import React, { useState } from 'react';
import { AlphaDashboard } from '@/components/AlphaDashboard';
import { LoginPage } from '@/components/LoginPage';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AlphaDashboard user={user!} />;
}
