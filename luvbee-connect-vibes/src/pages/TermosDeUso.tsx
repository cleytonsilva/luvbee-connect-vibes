import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TermosDeUso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2" />
          Voltar
        </Button>

        <Card className="shadow-hard border-2">
          <CardHeader>
            <CardTitle className="text-3xl font-bold font-display text-center">
              Termos de Uso e Política de Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">1. Elegibilidade e Idade Mínima</h2>
              <p className="text-muted-foreground mb-4">
                O luvbee é uma rede social exclusiva para <strong>maiores de 18 anos</strong>. 
                Ao criar uma conta, você declara e garante que possui pelo menos 18 anos de idade. 
                A verificação de idade pode ser solicitada a qualquer momento, e contas de menores 
                de idade serão imediatamente encerradas.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">2. Responsabilidade do Usuário</h2>
              <p className="text-muted-foreground mb-4">
                <strong>A responsabilidade pelo uso da plataforma é totalmente do usuário.</strong> 
                Você é responsável por todas as atividades realizadas em sua conta, incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Conteúdo compartilhado (fotos, textos, mensagens)</li>
                <li>Interações com outros usuários</li>
                <li>Informações pessoais divulgadas</li>
                <li>Consequências legais de suas ações na plataforma</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">3. Proibição de Conteúdo Inadequado</h2>
              <p className="text-muted-foreground mb-4">
                É <strong>estritamente proibido</strong> compartilhar:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Fotos sensuais ou explícitas</strong> de menores de idade. 
                  Qualquer conteúdo envolvendo menores será reportado imediatamente às autoridades competentes.
                </li>
                <li>
                  <strong>Fotos sensuais ou explícitas</strong> sem consentimento explícito das pessoas retratadas.
                </li>
                <li>Conteúdo que viole direitos de imagem ou privacidade de terceiros.</li>
                <li>Material que promova atividades ilegais.</li>
                <li>Conteúdo que incite violência, discriminação ou ódio.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">4. Compartilhamento de Informações Pessoais</h2>
              <p className="text-muted-foreground mb-4">
                Você é responsável por proteger suas próprias informações pessoais. 
                Recomendamos que você:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Não compartilhe informações sensíveis (endereço completo, documentos, dados bancários)</li>
                <li>Use a plataforma com cautela ao interagir com outros usuários</li>
                <li>Denuncie qualquer comportamento suspeito ou inadequado</li>
                <li>Não compartilhe senhas ou dados de acesso com terceiros</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                O luvbee não se responsabiliza por informações pessoais compartilhadas voluntariamente 
                pelos usuários em conversas, perfis ou outros meios de comunicação da plataforma.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">5. Privacidade e Dados</h2>
              <p className="text-muted-foreground mb-4">
                Coletamos e processamos seus dados conforme nossa Política de Privacidade. 
                Ao usar o luvbee, você concorda com a coleta e processamento de seus dados pessoais 
                para fins de funcionamento da plataforma, incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Dados de cadastro (nome, e-mail, idade)</li>
                <li>Localização (para encontrar locais próximos)</li>
                <li>Preferências e interesses</li>
                <li>Conteúdo compartilhado na plataforma</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">6. Moderação e Remoção de Conteúdo</h2>
              <p className="text-muted-foreground mb-4">
                Reservamo-nos o direito de moderar, remover ou bloquear qualquer conteúdo que:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Viole estes Termos de Uso</li>
                <li>Seja considerado inadequado, ofensivo ou ilegal</li>
                <li>Infrinja direitos de terceiros</li>
                <li>Comprometa a segurança da plataforma</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Contas que violem repetidamente estes termos serão permanentemente banidas.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">7. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground mb-4">
                O luvbee não se responsabiliza por:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Interações entre usuários fora da plataforma</li>
                <li>Conteúdo compartilhado por terceiros</li>
                <li>Danos decorrentes do uso ou impossibilidade de uso da plataforma</li>
                <li>Informações pessoais compartilhadas voluntariamente pelos usuários</li>
                <li>Consequências legais de ações dos usuários</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">8. Alterações nos Termos</h2>
              <p className="text-muted-foreground mb-4">
                Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. 
                Alterações significativas serão comunicadas aos usuários. O uso continuado da 
                plataforma após alterações constitui aceitação dos novos termos.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">9. Contato e Denúncias</h2>
              <p className="text-muted-foreground mb-4">
                Para denúncias de conteúdo inadequado, violações destes termos ou questões relacionadas 
                à privacidade, entre em contato através do Instagram <strong>@luvbeebr</strong> ou 
                através dos canais oficiais da plataforma.
              </p>
            </div>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground text-center">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

