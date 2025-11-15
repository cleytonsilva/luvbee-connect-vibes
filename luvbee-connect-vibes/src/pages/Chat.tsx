import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import person1 from "@/assets/person-1.jpg";

interface Message {
  id: number;
  text: string;
  sender: "user" | "other";
  timestamp: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { personId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Oi! Vi que você também curtiu o The Neon Lounge! 😊",
      sender: "other",
      timestamp: "19:30",
    },
    {
      id: 2,
      text: "Oi! Sim, adoro o ambiente de lá! Você vai hoje?",
      sender: "user",
      timestamp: "19:32",
    },
    {
      id: 3,
      text: "Sim! Vou por volta das 22h. Quer encontrar lá?",
      sender: "other",
      timestamp: "19:33",
    },
  ]);

  const person = {
    name: "Ana",
    image: person1,
  };

  const handleSend = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: message,
        sender: "user",
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages([...messages, newMessage]);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <Avatar>
          <AvatarImage src={person.image} alt={person.name} />
          <AvatarFallback>{person.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{person.name}</h2>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
            </div>
          </div>
        ))}
      </main>

      {/* Input */}
      <footer className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Escreva uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default Chat;
