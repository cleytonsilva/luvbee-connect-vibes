import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Users, Zap, Music, MessageSquare } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { useHeroVideos } from "@/services/video.service";

const Welcome = () => {
  const navigate = useNavigate();
  const { videoUrls, isLoading } = useHeroVideos();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [nextVideoIndex, setNextVideoIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  // Pré-carregar próximo vídeo
  useEffect(() => {
    if (isLoading || videoUrls.length === 0) return;
    
    const nextIndex = (currentVideoIndex + 1) % videoUrls.length;
    setNextVideoIndex(nextIndex);
    
    // Pré-carregar próximo vídeo
    const nextVideo = nextVideoRef.current;
    if (nextVideo && videoUrls[nextIndex]) {
      nextVideo.load();
    }
  }, [currentVideoIndex, isLoading, videoUrls]);

  // Gerenciar reprodução do vídeo atual
  useEffect(() => {
    const currentVideo = currentVideoRef.current;
    if (!currentVideo || isLoading || videoUrls.length === 0) return;

    const handleVideoEnd = () => {
      // Iniciar transição suave
      setIsTransitioning(true);
      
      // Fazer fade out do vídeo atual e fade in do próximo
      const nextVideo = nextVideoRef.current;
      if (nextVideo) {
        // Reproduzir próximo vídeo
        nextVideo.play().catch((error) => {
          console.warn('Erro ao reproduzir próximo vídeo:', error);
        });
        
        // Após transição, trocar referências
        setTimeout(() => {
          setCurrentVideoIndex((prev) => (prev + 1) % videoUrls.length);
          setIsTransitioning(false);
        }, 500); // Duração do fade (500ms)
      }
    };

    const handleCanPlay = () => {
      // Quando o vídeo está pronto, reproduzir
      currentVideo.play().catch((error) => {
        console.warn('Erro ao reproduzir vídeo:', error);
      });
    };

    currentVideo.addEventListener('ended', handleVideoEnd);
    currentVideo.addEventListener('canplay', handleCanPlay);
    
    // Carregar vídeo atual
    currentVideo.load();

    return () => {
      currentVideo.removeEventListener('ended', handleVideoEnd);
      currentVideo.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentVideoIndex, isLoading, videoUrls]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section - Enhanced */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Vídeo atual de fundo */}
        {!isLoading && videoUrls.length > 0 && (
          <>
            <video
              ref={currentVideoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
              muted
              loop={false}
              playsInline
            >
              <source src={videoUrls[currentVideoIndex]} type="video/mp4" />
            </video>
            
            {/* Próximo vídeo (pré-carregado para transição suave) */}
            {videoUrls[nextVideoIndex] && (
              <video
                ref={nextVideoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  isTransitioning ? 'opacity-100' : 'opacity-0'
                }`}
                muted
                loop={false}
                playsInline
              >
                <source src={videoUrls[nextVideoIndex]} type="video/mp4" />
              </video>
            )}
          </>
        )}
        
        {/* Gradiente de transparência com efeitos neo-brutalistas */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        {/* Elementos decorativos - Bordas e linhas */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1 bg-primary"
          animate={{ scaleX: [0.3, 1, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-accent"
          animate={{ scaleX: [1, 0.3, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <motion.h1 
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
              whileHover={{ scale: 1.05 }}
            >
              luvbee
            </motion.h1>
            <motion.img 
              src="/abaicon.png" 
              alt="Luvbee Logo" 
              className="w-16 h-16 md:w-24 md:h-24 object-contain border-4 border-primary p-2"
              animate={{
                scale: [1, 1.1, 1],
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
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
                rotate: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              whileHover={{
                scale: 1.3,
                rotate: [0, 360],
                transition: { duration: 1 },
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <p className="text-xl md:text-2xl mb-2 max-w-2xl mx-auto text-foreground/90 font-semibold">
              Encontre os melhores locais da noite
            </p>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-foreground/75">
              Conecte-se com pessoas que compartilham seus gostos
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto border-4 border-primary shadow-hard font-display font-bold text-lg px-8 py-6"
              >
                Começar Agora
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto border-4 border-primary shadow-hard font-display font-bold text-lg px-8 py-6"
              >
                Já tenho conta
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Neo-Brutalista */}
      <section className="relative py-32 bg-background overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-none border-4 border-primary/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-40 -left-40 w-96 h-96 bg-accent/20 rounded-none border-4 border-accent/40"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold font-display border-4 border-primary px-6 py-4 inline-block shadow-hard">
              Como Funciona
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { icon: MapPin, title: "Descubra Locais", desc: "Navegue por bares e baladas próximos que combinam com seu estilo", color: "primary" },
              { icon: Heart, title: "Dê Match", desc: "Curta os locais que te interessam e veja quem mais está indo", color: "accent" },
              { icon: Users, title: "Conecte-se", desc: "Converse com pessoas que curtiram o mesmo lugar e têm gostos similares", color: "secondary" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className={`p-8 border-4 border-${item.color} bg-card shadow-hard neo-brutalist-box group hover:shadow-2xl transition-all`}
              >
                <div className={`w-20 h-20 mx-auto mb-6 bg-${item.color} border-4 border-${item.color}-foreground flex items-center justify-center shadow-hard group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-10 h-10 text-card" />
                </div>
                <h3 className="text-2xl font-bold font-display mb-4">{item.title}</h3>
                <p className="text-foreground/80 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: "50K+", label: "Usuários Ativos" },
              { number: "1000+", label: "Locais Mapeados" },
              { number: "100K+", label: "Matches Realizados" },
              { number: "24/7", label: "Suporte" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold font-display mb-2">
                  {stat.number}
                </div>
                <p className="text-lg opacity-90">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold font-display">
              Recursos Incríveis
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Zap,
                title: "Recomendações em Tempo Real",
                desc: "IA inteligente que aprende seus gostos e recomenda locais perfeitos para você",
              },
              {
                icon: Music,
                title: "Identifique a Vibe",
                desc: "Saiba qual a vibe de cada lugar antes de chegar: música, público, energia",
              },
              {
                icon: MessageSquare,
                title: "Chat Integrado",
                desc: "Converse com pessoas que vão estar no mesmo local que você",
              },
              {
                icon: Heart,
                title: "Comunidade Vibrante",
                desc: "Faça novos amigos que compartilham seus interesses e estilo de vida",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 border-4 border-foreground bg-background shadow-hard hover:shadow-2xl transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary border-4 border-primary-foreground flex items-center justify-center flex-shrink-0 shadow-hard group-hover:scale-110 transition-transform">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold font-display mb-2">{feature.title}</h3>
                    <p className="text-foreground/80">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Neo-Brutalista */}
      <section className="relative py-32 bg-gradient-to-r from-primary to-accent text-primary-foreground overflow-hidden">
        <motion.div
          className="absolute inset-0 border-8 border-primary-foreground/20"
          animate={{ borderColor: ["rgba(255,0,255,0.2)", "rgba(255,255,0,0.2)", "rgba(255,0,255,0.2)"] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold font-display mb-6 border-4 border-primary-foreground px-6 py-4 inline-block shadow-hard">
              Pronto para a Noite?
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl mb-12 opacity-95 font-display"
          >
            Junte-se aos melhores descobridores de rolês
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-background text-primary hover:bg-background/90 border-4 border-background shadow-hard font-display font-bold text-lg px-8 py-6"
            >
              Criar Conta Grátis
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => navigate('/auth')}
              className="border-4 border-background text-background hover:bg-background/10 font-display font-bold text-lg px-8 py-6"
            >
              Entrar
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Welcome;
