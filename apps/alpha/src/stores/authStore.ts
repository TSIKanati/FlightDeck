import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: async (email: string, password: string) => {
        // For demo purposes, accept the admin credentials
        // In production, this would call the API
        if (email === 'kanati@translatorseries.com' && password === 'TSI-Admin-2026!') {
          const user: User = {
            id: '1',
            email: 'kanati@translatorseries.com',
            role: 'SuperAdmin',
            permissions: [
              'alpha_flightdeck.full',
              'all_apps.full',
              'user_management.full',
              'billing.full',
              'audit_logs.full',
              'system_config.full',
              'deployment.full',
              'data_export.full'
            ]
          };

          set({
            isAuthenticated: true,
            user,
            token: 'demo-token-' + Date.now()
          });
          return true;
        }
        return false;
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null
        });
      }
    }),
    {
      name: 'flightdeck-auth'
    }
  )
);
