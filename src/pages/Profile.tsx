import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Settings, Plus, X, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

// Interesses pré-definidos
const PREDEFINED_INTERESTS = [
  "Música", "Viagens", "Fotografia", "Cinema", "Livros", "Arte", "Esportes",
  "Culinária", "Dança", "Tecnologia", "Natureza", "História", "Moda", "Yoga",
  "Games", "Pets", "Café", "Vinho", "Cerveja", "Cocktails", "Praia", "Montanha",
  "Festas", "Cultura", "Idiomas", "Voluntariado", "Empreendedorismo", "Bem-estar"
];

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, updateProfile, isLoading: authLoading } = useAuth();
  
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "photos" | "interests">("info");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do perfil
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setBio(profile.bio || "");
      setAvatar(profile.avatar_url || "");
      setPhotos(profile.photos || []);
      setInterests(profile.interests || []);
    }
  }, [profile]);

  // Upload de avatar
  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo e tamanho
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter menos de 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload para o bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatar(publicUrl);
      
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso",
      });
    } catch (error) {
      console.error("[Profile] Error uploading avatar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Upload de foto adicional
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter menos de 5MB", variant: "destructive" });
      return;
    }

    if (photos.length >= 6) {
      toast({ title: "Limite atingido", description: "Você pode adicionar até 6 fotos", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `photo-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      setPhotos(prev => [...prev, publicUrl]);
      
      toast({
        title: "Foto adicionada!",
        description: "Sua foto foi adicionada com sucesso",
      });
    } catch (error) {
      console.error("[Profile] Error uploading photo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Remover foto
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Adicionar interesse
  const handleAddInterest = () => {
    if (!newInterest.trim()) return;
    if (interests.includes(newInterest.trim())) {
      toast({ title: "Atenção", description: "Este interesse já foi adicionado" });
      return;
    }
    if (interests.length >= 10) {
      toast({ title: "Limite atingido", description: "Você pode adicionar até 10 interesses", variant: "destructive" });
      return;
    }
    setInterests(prev => [...prev, newInterest.trim()]);
    setNewInterest("");
  };

  // Remover interesse
  const handleRemoveInterest = (interest: string) => {
    setInterests(prev => prev.filter(i => i !== interest));
  };

  // Adicionar interesse pré-definido
  const handleAddPredefinedInterest = (interest: string) => {
    if (interests.includes(interest)) {
      handleRemoveInterest(interest);
    } else if (interests.length < 10) {
      setInterests(prev => [...prev, interest]);
    }
  };

  // Salvar perfil
  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: name,
        bio: bio,
        avatar_url: avatar,
        photos: photos,
        interests: interests,
        updated_at: new Date().toISOString(),
      });

      toast({
        title: "Perfil atualizado! ✨",
        description: "Suas alterações foram salvas com sucesso",
      });
    } catch (error) {
      console.error("[Profile] Error saving profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Meu Perfil</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.SETTINGS)}>
          <Settings />
        </Button>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto p-4 pb-24">
        <Card className="shadow-hard border-2">
          {/* Avatar Section */}
          <CardHeader className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <Avatar className="w-full h-full border-4 border-primary">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="text-4xl">{name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full shadow-hard"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <CardTitle className="text-2xl">{name || "Seu Nome"}</CardTitle>
            <CardDescription>{bio || "Adicione uma bio para se destacar"}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              <Button
                variant={activeTab === "info" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("info")}
              >
                Informações
              </Button>
              <Button
                variant={activeTab === "photos" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("photos")}
              >
                Fotos ({photos.length})
              </Button>
              <Button
                variant={activeTab === "interests" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("interests")}
              >
                Interesses ({interests.length})
              </Button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "info" && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Conte um pouco sobre você..."
                      rows={4}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {bio.length}/300
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === "photos" && (
                <motion.div
                  key="photos"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Adicione até 6 fotos para seu perfil
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {photos.length < 6 && (
                      <Button
                        variant="outline"
                        className="aspect-square flex flex-col items-center justify-center gap-2 border-dashed"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-6 h-6" />
                            <span className="text-xs">Adicionar</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </motion.div>
              )}

              {activeTab === "interests" && (
                <motion.div
                  key="interests"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Adicionar Interesse</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="Digite um interesse"
                        onKeyDown={(e) => e.key === "Enter" && handleAddInterest()}
                        maxLength={30}
                      />
                      <Button onClick={handleAddInterest} size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant="secondary"
                          className="px-3 py-1 cursor-pointer hover:bg-destructive hover:text-white transition-colors"
                          onClick={() => handleRemoveInterest(interest)}
                        >
                          {interest} <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Label className="mb-2 block">Interesses Populares</Label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_INTERESTS.map((interest) => (
                        <Badge
                          key={interest}
                          variant={interests.includes(interest) ? "default" : "outline"}
                          className="cursor-pointer transition-all"
                          onClick={() => handleAddPredefinedInterest(interest)}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save Button */}
            <Button 
              onClick={handleSave} 
              className="w-full mt-6"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
