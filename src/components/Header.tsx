import React from 'react';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent } from '@/components/ui/navigation-menu';
import { Users, Package, History as HistoryIcon, Timer, LineChart, BarChart3, Gift, ListChecks } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isParetoActive = ['/pareto-clientes', '/pareto-produtos'].some(p => isActive(p));
  const isReportsActive = ['/history', '/recencia-recorrencia', '/year-over-year', '/curva-crescimento', '/demo-comodatos'].some(p => isActive(p));

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
          <span className="text-slate-700 text-sm">Business Intelligence - Terris</span>
        </div>

        {/* Right: Navigation + User + Logout */}
        <div className="flex items-center gap-2">
          {/* Navigation Menu horizontal com viewport animado */}
          <NavigationMenu className="justify-start">
            <NavigationMenuList>
              {/* Categoria: 80/20 */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`${isParetoActive ? 'bg-slate-100 text-green-600' : ''}`}>📊 80/20</NavigationMenuTrigger>
                <NavigationMenuContent className="md:w-[360px]">
                  <div className="grid gap-1 p-2">
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/pareto-clientes') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/pareto-clientes')}
                    >
                      <Users className="mr-2 h-4 w-4" /> Clientes
                    </Button>
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/pareto-produtos') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/pareto-produtos')}
                    >
                      <Package className="mr-2 h-4 w-4" /> Produtos
                    </Button>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Categoria: Relatórios */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`${isReportsActive ? 'bg-slate-100 text-green-600' : ''}`}>📑 Relatórios</NavigationMenuTrigger>
                <NavigationMenuContent className="md:w-[420px]">
                  <div className="grid gap-1 p-2">
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/history') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/history')}
                    >
                      <HistoryIcon className="mr-2 h-4 w-4" /> Histórico de Compras
                    </Button>
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/recencia-recorrencia') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/recencia-recorrencia')}
                    >
                      <Timer className="mr-2 h-4 w-4" /> Recência/Recorrência
                    </Button>
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/year-over-year') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/year-over-year')}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" /> Comparação Anual
                    </Button>
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/curva-crescimento') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/curva-crescimento')}
                    >
                      <LineChart className="mr-2 h-4 w-4" /> Curva de Crescimento
                    </Button>
                    <Button
                      variant="ghost"
                      className={`justify-start ${isActive('/demo-comodatos') ? 'bg-slate-100 text-green-600' : ''}`}
                      onClick={() => navigate('/demo-comodatos')}
                    >
                      <Gift className="mr-2 h-4 w-4" /> Demonstrações
                    </Button>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Leads permanece como botão direto */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads')}
            className={`${isActive('/leads') ? 'bg-slate-100 text-green-600' : 'text-slate-600 hover:bg-slate-100 hover:text-green-600'} px-3 py-2 rounded-md transition`}
          >
            <ListChecks className="mr-2 h-4 w-4" /> Leads
          </Button>

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
