import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const goToLeads = () => navigate('/leads');
  const goHome = () => navigate('/');

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f7fa' }}>
      <Card className="w-full max-w-lg rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6" style={{ color: '#dc2626' }} />
            <CardTitle className="text-xl" style={{ color: '#1e293b' }}>Acesso não autorizado</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: '#64748b' }}>
            Você não tem permissão para acessar esta página. Para acesso, solicite autorização a um administrador.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="default" onClick={user?.role === 'marketing' ? goToLeads : goHome}>
              {user?.role === 'marketing' ? 'Ir para Leads' : 'Ir para Home'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/login')}>Fazer login com outra conta</Button>
            <Button variant="ghost" onClick={() => { logout(); navigate('/login'); }}>Sair</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;