import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [drinkPreference, setDrinkPreference] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [venueType, setVenueType] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulated login - replace with actual authentication
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta ao luvbee",
      });
      navigate("/locations");
    }, 1000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!drinkPreference || !foodPreference || !venueType) {
      toast({
        variant: "destructive",
        title: "Ops!",
        description: "Preencha todas as suas preferências",
      });
      return;
    }

    setIsLoading(true);

    // Simulated signup - replace with actual authentication
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao luvbee",
      });
      navigate("/locations");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2" />
          Voltar
        </Button>

        <Card className="shadow-hard border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              luv<span className="text-primary">bee</span>
            </CardTitle>
            <CardDescription>
              Sua noite perfeita começa aqui
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-4 text-sm text-muted-foreground">
                      Suas Preferências
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="drink">Bebida Favorita</Label>
                        <Select value={drinkPreference} onValueChange={setDrinkPreference}>
                          <SelectTrigger id="drink">
                            <SelectValue placeholder="Escolha..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cerveja">Cerveja</SelectItem>
                            <SelectItem value="vinho">Vinho</SelectItem>
                            <SelectItem value="drinks">Drinks</SelectItem>
                            <SelectItem value="destilados">Destilados</SelectItem>
                            <SelectItem value="nao-alcoolico">Não alcoólico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="food">Tipo de Comida</Label>
                        <Select value={foodPreference} onValueChange={setFoodPreference}>
                          <SelectTrigger id="food">
                            <SelectValue placeholder="Escolha..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="petiscos">Petiscos</SelectItem>
                            <SelectItem value="japonesa">Japonesa</SelectItem>
                            <SelectItem value="italiana">Italiana</SelectItem>
                            <SelectItem value="hamburger">Hambúrguer</SelectItem>
                            <SelectItem value="vegetariana">Vegetariana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="venue">Tipo de Local</Label>
                        <Select value={venueType} onValueChange={setVenueType}>
                          <SelectTrigger id="venue">
                            <SelectValue placeholder="Escolha..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="balada">Balada</SelectItem>
                            <SelectItem value="pub">Pub</SelectItem>
                            <SelectItem value="lounge">Lounge</SelectItem>
                            <SelectItem value="rooftop">Rooftop</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
