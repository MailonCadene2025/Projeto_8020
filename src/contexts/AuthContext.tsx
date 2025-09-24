import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  role: 'admin' | 'vendedor';
  vendedor?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const users = [
  { username: 'admin', password: 'admin@951', role: 'admin' as const },
  { username: 'Nara', password: 'Nara@753', role: 'vendedor' as const, vendedor: 'NARA' },
  { username: 'Matheus', password: 'Matheus@753', role: 'vendedor' as const, vendedor: 'MATHEUS' },
  { username: 'Luiz', password: 'luiz@753', role: 'vendedor' as const, vendedor: 'LUIZ' },
  { username: 'Sara', password: 'sara@753', role: 'vendedor' as const, vendedor: 'SARA' },
  { username: 'Itacir', password: 'itacir@753', role: 'vendedor' as const, vendedor: 'ITACIR' },
  { username: 'Daniel', password: 'daniel@753', role: 'vendedor' as const, vendedor: 'DANIEL' },
  { username: 'Pedro', password: 'pedro@753', role: 'vendedor' as const, vendedor: 'PEDRO' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const foundUser = users.find(u => u.username === username && u.password === password);
    
    if (foundUser) {
      const userData: User = {
        username: foundUser.username,
        role: foundUser.role,
        vendedor: foundUser.vendedor
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};