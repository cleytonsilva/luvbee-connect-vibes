import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Users } from "lucide-react";
import heroImage from "@/assets/hero-nightlife.jpg";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 text-foreground">
            luv<span className="text-primary">bee</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-foreground/90">
            Encontre os melhores locais da noite e conecte-se com pessoas que compartilham seus gostos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto"
            >
              Começar Agora
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto"
            >
              Já tenho conta
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Como funciona</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center shadow-hard">
                <MapPin className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Descubra Locais</h3>
              <p className="text-muted-foreground">
                Navegue por bares e baladas próximos que combinam com seu estilo
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-accent rounded-full flex items-center justify-center shadow-hard">
                <Heart className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Dê Match</h3>
              <p className="text-muted-foreground">
                Curta os locais que te interessam e veja quem mais está indo
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center shadow-hard">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Conecte-se</h3>
              <p className="text-muted-foreground">
                Converse com pessoas que curtiram o mesmo lugar e têm gostos similares
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para começar sua noite?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de pessoas encontrando os melhores rolês
          </p>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/auth')}
            className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
          >
            Criar Conta Grátis
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
