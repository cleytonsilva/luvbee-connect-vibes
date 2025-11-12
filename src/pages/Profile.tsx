import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import avatarPlaceholder from "@/assets/avatar-placeholder.jpg";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState("Você");
  const [bio, setBio] = useState("Explorando a noite da cidade");
  const [drinkPreference, setDrinkPreference] = useState("drinks");
  const [foodPreference, setFoodPreference] = useState("petiscos");
  const [venueType, setVenueType] = useState("bar");
  const [avatar, setAvatar] = useState(avatarPlaceholder);

  const handleSave = () => {
    toast({
      title: "Perfil atualizado! ✨",
      description: "Suas alterações foram salvas com sucesso",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.LOCATIONS)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Perfil</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.SETTINGS)}>
          <Settings />
        </Button>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto p-4">
        <Card className="shadow-hard border-2">
          <CardHeader className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <Avatar className="w-full h-full border-4 border-primary">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="text-4xl">{name[0]}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full shadow-hard"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <CardTitle className="text-2xl">{name}</CardTitle>
            <CardDescription>{bio}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você"
              />
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-4">Preferências</h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="drink">Bebida Favorita</Label>
                  <Select value={drinkPreference} onValueChange={setDrinkPreference}>
                    <SelectTrigger id="drink">
                      <SelectValue />
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
                      <SelectValue />
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
                      <SelectValue />
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

            <Button onClick={handleSave} className="w-full mt-6">
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
