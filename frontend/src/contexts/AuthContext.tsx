import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'nurse' | 'admin' | 'supervisor';

export interface User {
  id: string;
  _id?: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  supervisor?: string;
  shiftTime?: string;
  avatar?: string;
}

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id || raw._id || ''),
    _id: raw._id ? String(raw._id) : undefined,
    email: String(raw.email || ''),
    name: String(raw.name || ''),
    role: (raw.role as UserRole) || 'nurse',
    department: raw.department ? String(raw.department) : undefined,
    departmentId: raw.departmentId ? String(raw.departmentId) : undefined,
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  authHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: normalizedPassword,
        }),
      });

      if (!response.ok) {
        // 401 = invalid credentials (handled in UI as such)
        if (response.status === 401) {
          return false;
        }

        // For any other HTTP error, throw so the caller can show
        // a generic "something went wrong" message instead of
        // "invalid email or password".
        const errorText = await response.text().catch(() => '');
        // eslint-disable-next-line no-console
        console.error('Login request failed:', response.status, errorText);
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data?.user) {
        return false;
      }

      setUser(normalizeUser(data.user as Record<string, unknown>));
      return true;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        authHeaders: () => (user?.email ? { 'x-user-email': user.email } : {}),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
