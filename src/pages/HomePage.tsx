import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Users } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { useHeroVideos } from "@/services/video.service";

const Welcome = () => {
  const navigate = useNavigate();
  const { videoUrls, isLoading } = useHeroVideos();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isLoading || videoUrls.length === 0) return;

    const handleVideoEnd = () => {
      // Avançar para o próximo vídeo
      setCurrentVideoIndex((prev) => (prev + 1) % videoUrls.length);
    };

    video.addEventListener('ended', handleVideoEnd);
    
    // Carregar e reproduzir o vídeo atual
    video.load();
    video.play().catch((error) => {
      console.warn('Erro ao reproduzir vídeo:', error);
    });

    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [currentVideoIndex, isLoading, videoUrls]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Vídeo de fundo */}
        {!isLoading && videoUrls.length > 0 && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop={false}
            playsInline
          >
            <source src={videoUrls[currentVideoIndex]} type="video/mp4" />
          </video>
        )}
        
        {/* Gradiente de transparência mantido */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <h1 
              className="text-6xl md:text-8xl font-bold font-display"
              style={{
                background: "linear-gradient(90deg, #ff00ff 0%, #FFFF00 25%, #ff00ff 50%, #FFFF00 75%, #ff00ff 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                backgroundPosition: "0% 50%",
                animation: "party-shine 4s ease-in-out infinite, glow-pulse 3s ease-in-out infinite",
              }}
            >
              luvbee
            </h1>
            <motion.img 
              src="/abaicon.png" 
              alt="Luvbee Logo" 
              className="w-16 h-16 md:w-24 md:h-24 object-contain"
              animate={{
                scale: [1, 1.1, 1],
                y: [0, -10, 0],
              }}
              transition={{
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              whileHover={{
                scale: 1.2,
                rotate: [0, 15, -15, 0],
                transition: { duration: 0.5 },
              }}
            />
          </div>
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
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-background text-primary hover:bg-background/90 border-4 border-background shadow-hard font-display font-bold"
          >
            Criar Conta Grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Welcome;