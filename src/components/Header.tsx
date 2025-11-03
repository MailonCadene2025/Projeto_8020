import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: '📊 80/20 - Clientes', path: '/pareto-clientes' },
    { label: '📦 80/20 - Produtos', path: '/pareto-produtos' },
    { label: '📈 Histórico de Compras', path: '/history' },
    { label: '📉 Comparação Anual', path: '/year-over-year' },
    { label: '🎁 Demonstrações', path: '/demo-comodatos' },
    { label: '📊 Leads', path: '/leads' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="bg-white border-b shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <img
            src="https://i.ibb.co/BpTtpvT/logo3.png"
            alt="Logo Terris"
            className="h-8 w-8 object-contain"
          />
          <span className="text-slate-700 text-sm">Central de Inteligência Comercial - Terris</span>
        </div>

        {/* Right: Navigation + User + Logout */}
        <div className="flex items-center gap-2">
          {navLinks.map(({ label, path }) => (
            <Button
              key={path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(path)}
              className={
                `${isActive(path) ? 'bg-slate-100 text-green-600' : 'text-slate-600 hover:bg-slate-100 hover:text-green-600'} ` +
                'px-3 py-2 rounded-md transition'
              }
            >
              {label}
            </Button>
          ))}

          <div className="px-3 py-2 rounded-md bg-slate-50 text-slate-700 text-sm">
            {`👤 ${user?.role ?? ''}`}
            {user?.role === 'vendedor' && user.vendedor ? ` (${user.vendedor})` : ''}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-slate-700 hover:text-green-700 hover:border-green-600"
          >
            🚪 Sair
          </Button>
        </div>
      </div>
    </header>
  );
};