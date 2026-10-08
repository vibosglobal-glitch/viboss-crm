export type UserRole = 'admin' | 'manager' | 'sdr' | 'closer' | 'hr' | 'lead_gen' | 'leadgen';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
}

/** Alias kept in sync with User for components that import from auth.api */
export type AuthUser = User;

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}
