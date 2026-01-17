import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FAQ: Record<string, string> = {
  "what is neuroharmonics": "NeuroHarmonics is an AI-based system that analyzes emotional states and provides wellness recommendations.",
  "how to reduce stress": "You can try deep breathing, box breathing, light yoga, and calming music.",
  "what is box breathing": "Box breathing is a technique where you inhale, hold, exhale, and hold again for 4 seconds each.",
  "is this medical": "No. NeuroHarmonics is a wellness support system, not a medical diagnostic tool.",
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<string[]>([
    "Hi! I can help answer general questions about mental wellness 😊",
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const key = input.toLowerCase();
    const reply =
      Object.keys(FAQ).find((q) => key.includes(q)) !== undefined
        ? FAQ[Object.keys(FAQ).find((q) => key.includes(q))!]
        : "I can help with breathing, yoga, stress reduction, and app usage.";

    setMessages((prev) => [...prev, `You: ${input}`, `Bot: ${reply}`]);
    setInput("");
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 rounded-full shadow-xl z-50"
        onClick={() => setOpen(true)}
      >
        <MessageCircle />
      </Button>

      {/* Chat Window */}
      {open && (
        <Card className="fixed bottom-20 right-6 w-80 h-96 flex flex-col shadow-2xl z-50">
          <div className="flex justify-between items-center p-3 border-b">
            <span className="font-semibold">NeuroBot</span>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
            {messages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>

          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <Button size="sm" onClick={handleSend}>
              Send
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
