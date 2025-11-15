import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm opacity-90">
              © {new Date().getFullYear()} luvbee. Todos os direitos reservados.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <Link 
              to="/termos-de-uso" 
              className="text-sm hover:underline opacity-90 hover:opacity-100 transition-opacity"
            >
              Termos de Uso
            </Link>
            
            <a
              href="https://instagram.com/luvbeebr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:underline opacity-90 hover:opacity-100 transition-opacity"
            >
              <Instagram className="w-4 h-4" />
              @luvbeebr
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

