
import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const analysisSessions = pgTable("analysis_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id
  emotion: text("emotion").notNull(), // Stress, Calm, Focus
  confidence: integer("confidence").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSessionSchema = createInsertSchema(analysisSessions).pick({
  userId: true,
  emotion: true,
  confidence: true,
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  userId: true,
  rating: true,
  comment: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
