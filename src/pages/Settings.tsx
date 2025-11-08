import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Lock, MapPin, Shield, LogOut, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showOnline, setShowOnline] = useState(true);

  const handleLogout = () => {
    toast({
      title: "Até logo! 👋",
      description: "Você foi desconectado com sucesso",
    });
    setTimeout(() => {
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Configurações</h1>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        {/* Notifications */}
        <Card className="shadow-hard border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Gerencie como você recebe notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="cursor-pointer">
                Ativar notificações
              </Label>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="shadow-hard border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Privacidade</CardTitle>
            </div>
            <CardDescription>
              Controle suas configurações de privacidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="location" className="cursor-pointer">
                Compartilhar localização
              </Label>
              <Switch
                id="location"
                checked={locationEnabled}
                onCheckedChange={setLocationEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="online" className="cursor-pointer">
                Mostrar status online
              </Label>
              <Switch
                id="online"
                checked={showOnline}
                onCheckedChange={setShowOnline}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="shadow-hard border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <CardTitle>Localização</CardTitle>
            </div>
            <CardDescription>
              Configure sua localização e preferências de busca
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Alterar Cidade
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="shadow-hard border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>
              Gerencie sua senha e segurança da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full">
              Alterar Senha
            </Button>
            <Button variant="outline" className="w-full">
              Autenticação em Dois Fatores
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="shadow-hard border-2 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>
              Ações permanentes na sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Conta
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>luvbee v1.0.0</p>
          <p className="mt-2">
            <Button variant="link" className="text-xs">
              Termos de Uso
            </Button>
            {" • "}
            <Button variant="link" className="text-xs">
              Política de Privacidade
            </Button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Settings;
