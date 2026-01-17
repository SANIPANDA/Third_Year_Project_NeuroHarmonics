import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import passport from "passport";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const { hashPassword } = setupAuth(app);

  /* ---------------- SEED DATA ---------------- */
  (async () => {
    const demoUser = await storage.getUserByUsername("demo");
    if (!demoUser) {
      const hashedPassword = await hashPassword("demo123");
      const user = await storage.createUser({
        username: "demo",
        password: hashedPassword,
      });

      console.log("Seeded demo user: demo / demo123");

      await storage.createSession(user.id, {
        emotion: "Stress",
        confidence: 85,
      });
      await storage.createSession(user.id, {
        emotion: "Calm",
        confidence: 92,
      });
      await storage.createSession(user.id, {
        emotion: "Focus",
        confidence: 78,
      });
    }
  })();

  /* ---------------- AUTH ROUTES ---------------- */

  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const input = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(input.password);

      const user = await storage.createUser({
        username: input.username,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post(
    api.auth.login.path,
    passport.authenticate("local"),
    (req, res) => {
      res.status(200).json(req.user);
    }
  );

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.user.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  /* ---------------- AUTH GUARD ---------------- */

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  /* ---------------- ANALYSIS ROUTES ---------------- */

  app.post(api.analysis.create.path, requireAuth, async (req, res) => {
    const emotions = ["Stress", "Calm", "Focus"];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const confidence = Math.floor(Math.random() * 30) + 70;

    const session = await storage.createSession(req.user!.id, {
      emotion,
      confidence,
    });

    res.status(201).json(session);
  });

  app.get(api.analysis.list.path, requireAuth, async (req, res) => {
    const sessions = await storage.getSessionsByUser(req.user!.id);
    res.json(sessions);
  });

  /* ---------------- REVIEW ROUTES ---------------- */

  app.post(api.reviews.create.path, requireAuth, async (req, res) => {
    try {
      const reviewData = api.reviews.create.input.parse(req.body);

      const review = await storage.createReview(req.user!.id, {
        rating: reviewData.rating,
        comment: reviewData.comment,
      });

      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.reviews.list.path, async (_req, res) => {
    const reviews = await storage.getReviews();
    res.json(reviews);
  });

  /* ---------------- RECOMMENDATIONS ---------------- */

  app.get(api.recommendations.list.path, requireAuth, (req, res) => {
    const { emotion } = req.params;

    const recommendations: Record<string, any[]> = {
      Stress: [
        {
          name: "Child's Pose",
          description: "A resting pose that calms the brain and relieves stress.",
          imageUrl:
            "https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=600",
          category: "Yoga",
        },
        {
          name: "Box Breathing",
          description: "Inhale 4s, Hold 4s, Exhale 4s, Hold 4s.",
          imageUrl:
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600",
          category: "Breathing",
        },
      ],
      Calm: [
        {
          name: "Light Stretching",
          description: "Gentle movements to maintain relaxation.",
          imageUrl:
            "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=600",
          category: "Stretching",
        },
        {
          name: "Mindful Observation",
          description: "Observe your surroundings without judgment.",
          imageUrl:
            "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=600",
          category: "Mindfulness",
        },
      ],
      Focus: [
        {
          name: "Tree Pose",
          description: "Improves balance and concentration.",
          imageUrl:
            "https://images.unsplash.com/photo-1562088287-b903a76b26eb?q=80&w=600",
          category: "Yoga",
        },
        {
          name: "Alternate Nostril Breathing",
          description: "Balances left and right brain hemispheres.",
          imageUrl:
            "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600",
          category: "Pranayama",
        },
      ],
    };

    res.json(recommendations[emotion] ?? recommendations.Calm);
  });

  return httpServer;
}
