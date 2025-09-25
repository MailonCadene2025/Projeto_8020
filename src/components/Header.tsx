import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Shield, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleYearOverYearClick = () => {
    navigate('/year-over-year');
  };

  const handleHistoryClick = () => {
    navigate('/history');
  };

  const handleParetoClick = () => {
    navigate('/');
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-primary">Sistema Pareto 80/20</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Botão Análise 80/20 */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleParetoClick}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Análise 80/20</span>
          </Button>
          
          {/* Botão Histórico de Compras */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleHistoryClick}
            className="flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Histórico de Compras</span>
          </Button>
          
          {/* Botão Year Over Year */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleYearOverYearClick}
            className="flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Comparação Anual</span>
          </Button>
          
          <div className="flex items-center space-x-2 text-sm">
            {user?.role === 'admin' ? (
              <Shield className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">{user?.username}</span>
            {user?.role === 'vendedor' && (
              <span className="text-muted-foreground">({user.vendedor})</span>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};