import { useRecommendations } from "@/hooks/use-recommendations";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import ChatBot from "@/components/ChatBot";

export default function Recommendations() {
  const [location] = useLocation();
  const [emotion, setEmotion] = useState<string>("Calm");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emotionParam = params.get("emotion");
    if (emotionParam) setEmotion(emotionParam);
  }, [location]);

  const { data: recommendations, isLoading } = useRecommendations(emotion);

  const emotionColors: Record<string, string> = {
    Stress: "bg-red-100 text-red-700",
    Calm: "bg-green-100 text-green-700",
    Focus: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* EXISTING HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Recommendations</h1>
          <p className="text-muted-foreground mt-1">
            Based on your state:
            <span
              className={`ml-2 px-2 py-0.5 rounded-md text-sm font-semibold ${
                emotionColors[emotion]
              }`}
            >
              {emotion}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {["Stress", "Calm", "Focus"].map((e) => (
            <Button
              key={e}
              size="sm"
              variant={emotion === e ? "default" : "outline"}
              onClick={() => setEmotion(e)}
              className="rounded-full"
            >
              {e}
            </Button>
          ))}
        </div>
      </div>

      {/* EXISTING RECOMMENDATIONS GRID */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations?.map((rec, i) => (
            <Card
              key={i}
              className="flex flex-col hover:shadow-xl transition"
            >
              <div className="aspect-video bg-muted overflow-hidden">
                <img
                  src={rec.imageUrl}
                  alt={rec.name}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute m-3 bg-white/90">
                  {rec.category}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle>{rec.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription>{rec.description}</CardDescription>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Start Exercise</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 🆕 GENERAL BREATHING EXERCISES */}
      <section>
        <h2 className="text-2xl font-display font-bold mb-4">
          General Breathing Exercises
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Box Breathing",
              desc: "Inhale, hold, exhale, hold for 4 seconds each.",
              img: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
            },
            {
              title: "Deep Breathing",
              desc: "Slow belly breathing to calm the nervous system.",
              img: "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif",
            },
            {
              title: "Anulom Vilom",
              desc: "Alternate nostril breathing for balance.",
              img: "https://media.giphy.com/media/xT0GqF1KkG2L5bZxK8/giphy.gif",
            },
          ].map((item) => (
            <Card key={item.title}>
              <img
                src={item.img}
                className="h-40 w-full object-cover rounded-t"
              />
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 🆕 CALM MUSIC */}
      <section>
        <h2 className="text-2xl font-display font-bold mb-4">
          Calming Music
        </h2>
        <audio controls className="w-full">
          <source
            src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            type="audio/mpeg"
          />
        </audio>
      </section>

      {/* 🆕 CHATBOT */}
      <ChatBot />
    </div>
  );
}
