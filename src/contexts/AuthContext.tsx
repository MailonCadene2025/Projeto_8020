import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  role: 'admin' | 'vendedor' | 'gerente' | 'marketing';
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
  { username: 'João', password: 'joao@951', role: 'gerente' as const },
  // Usuário joao (sem acento) com nova senha e papel de gerente
  { username: 'joao', password: 'joao@951', role: 'gerente' as const },
  { username: 'Nara', password: 'Nara@753', role: 'vendedor' as const, vendedor: 'NARA' },
  { username: 'Matheus', password: 'matheus@753', role: 'vendedor' as const, vendedor: 'MATHEUS' },
  { username: 'Luiz', password: 'luiz@753', role: 'vendedor' as const },
  { username: 'Sara', password: 'sara@753', role: 'vendedor' as const, vendedor: 'SARA' },
  { username: 'Itacir', password: 'itacir@753', role: 'vendedor' as const, vendedor: 'ITACIR' },
  { username: 'Daniel', password: 'daniel@753', role: 'vendedor' as const, vendedor: 'DANIEL' },
  { username: 'Pedro', password: 'pedro@753', role: 'vendedor' as const, vendedor: 'PEDRO' },
  { username: 'Rocha', password: 'rocha@753', role: 'vendedor' as const, vendedor: 'ROCHA' },
  { username: 'Pieri', password: 'pieri@753', role: 'vendedor' as const, vendedor: 'PIERI' },
  { username: 'Willian', password: 'willian@753', role: 'vendedor' as const, vendedor: 'WILLIAN' },
  { username: 'Guilherme', password: 'guilherme@753', role: 'vendedor' as const, vendedor: 'GUILHERME' },
  { username: 'Johny', password: 'johny@753', role: 'vendedor' as const, vendedor: 'JOHNY' },
  { username: 'Aylton', password: 'aylton@753', role: 'vendedor' as const, vendedor: 'AYLTON' },
  { username: 'Rhafisson', password: 'rhafisson@753', role: 'vendedor' as const, vendedor: 'RHAFISSON' },
  { username: 'Marcio', password: 'marcio@753', role: 'vendedor' as const, vendedor: 'MARCIO' },
  // Usuário específico com travas de filtros personalizadas
  { username: 'Rodrigo', password: 'rodrigo@951', role: 'gerente' as const },
  // Usuário específico Sandro com travas personalizadas
  { username: 'Sandro', password: 'sandro@951', role: 'gerente' as const },
  // Usuário de marketing: acesso somente à página de Leads com privilégios de filtros
  { username: 'marketing', password: 'marketing@753', role: 'marketing' as const }
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
