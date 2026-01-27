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

// Demo users for testing
const demoUsers: Record<string, User & { password: string }> = {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    const demoUser = demoUsers[email.toLowerCase()];
    if (demoUser && demoUser.password === password) {
      const { password: _, ...userWithoutPassword } = demoUser;
      setUser(userWithoutPassword);
      return true;
    }
    return false;
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
