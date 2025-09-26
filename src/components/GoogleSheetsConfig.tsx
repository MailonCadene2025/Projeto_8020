import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, Check, AlertCircle } from 'lucide-react';

interface GoogleSheetsConfigProps {
  onConnect: (apiKey: string, sheetId: string) => Promise<void>;
  isConnecting: boolean;
  isConnected: boolean;
  error?: string;
}

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

export const GoogleSheetsConfig: React.FC<GoogleSheetsConfigProps> = ({ 
  onConnect,
  isConnecting,
  isConnected,
  error 
}) => {

  const handleConnect = async () => {
    await onConnect(API_KEY, SHEET_ID);
  };

  const getStatusColor = () => {
    if (isConnected) return 'text-success';
    if (error) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getStatusIcon = () => {
    if (isConnecting) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isConnected) return <Check className="h-4 w-4" />;
    if (error) return <AlertCircle className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={getStatusColor()}>
              <h1 className="text-2xl font-bold" style={{color: '#085c2b'}}>Bem vindo(a), central de inteligência comercial da Terris</h1>
              </span>
            </CardTitle>
            <CardDescription>
                   Acompanhe o 80/20 da sua região, histórico de compras e Comparativo anual
            </CardDescription>
          </div>
          {isConnected && (
            <div className="px-3 py-1 bg-success-muted text-success text-sm rounded-full font-medium">
              Conectado
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleConnect}
              disabled={isConnecting || isConnected}
              className="bg-gradient-primary hover:opacity-90 min-w-[140px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : isConnected ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Conectado
                </>
              ) : (
                'Conectar e Carregar'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};