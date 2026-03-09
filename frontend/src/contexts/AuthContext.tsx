import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'nurse' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  supervisor?: string;
  shiftTime?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface DemoUser extends User {
  password: string;
}

const demoUsers: Record<string, DemoUser> = {
  'nurse@hospital.com': {
    id: '1',
    email: 'nurse@hospital.com',
    password: 'nurse123',
    name: 'Sarah Johnson',
    role: 'nurse',
    department: 'Intensive Care Unit (ICU)',
    supervisor: 'Dr. Michael Chen',
    shiftTime: '7:00 AM - 7:00 PM',
  },
  'admin@hospital.com': {
    id: '2',
    email: 'admin@hospital.com',
    password: 'admin123',
    name: 'Emily Rodriguez',
    role: 'admin',
    department: 'Training Administration',
  },
};

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

      setUser(data.user as User);
      return true;
    } catch (err) {
      // If backend is unreachable or errors, fall back to local demo users
      const demoUser = demoUsers[normalizedEmail];
      if (demoUser && demoUser.password === normalizedPassword) {
        const { password: _pw, ...userWithoutPassword } = demoUser;
        setUser(userWithoutPassword);
        return true;
      }

      // Re-throw so the caller can show a generic error message
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
