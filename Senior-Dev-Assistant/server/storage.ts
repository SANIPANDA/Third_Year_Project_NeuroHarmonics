import {
  users,
  analysisSessions,
  reviews,
  type User,
  type InsertUser,
  type AnalysisSession,
  type Review,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createSession(
    userId: number,
    data: { emotion: string; confidence: number }
  ): Promise<AnalysisSession>;

  getSessionsByUser(userId: number): Promise<AnalysisSession[]>;

  createReview(
    userId: number,
    data: { rating: number; comment: string }
  ): Promise<Review>;

  getReviews(): Promise<(Review & { username: string })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async createSession(userId: number, data: { emotion: string; confidence: number }) {
    const [session] = await db
      .insert(analysisSessions)
      .values({ ...data, userId })
      .returning();
    return session;
  }

  async getSessionsByUser(userId: number) {
    return db
      .select()
      .from(analysisSessions)
      .where(eq(analysisSessions.userId, userId))
      .orderBy(desc(analysisSessions.createdAt));
  }

  async createReview(userId: number, data: { rating: number; comment: string }) {
    const [review] = await db
      .insert(reviews)
      .values({ ...data, userId })
      .returning();
    return review;
  }

  async getReviews() {
    return db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        username: users.username,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .orderBy(desc(reviews.createdAt));
  }
}

/* ---------------- MOCK STORAGE ---------------- */

export class MockStorage implements IStorage {
  private users = new Map<number, User>();
  private sessions: AnalysisSession[] = [];
  private reviews: Review[] = [];
  private uid = 1;
  private sid = 1;
  private rid = 1;

  async getUser(id: number) {
    return this.users.get(id);
  }

  async getUserByUsername(username: string) {
    return [...this.users.values()].find(u => u.username === username);
  }

  async createUser(user: InsertUser) {
    const u: User = { id: this.uid++, ...user };
    this.users.set(u.id, u);
    return u;
  }

  async createSession(userId: number, data: { emotion: string; confidence: number }) {
    const s: AnalysisSession = {
      id: this.sid++,
      userId,
      ...data,
      createdAt: new Date(),
    };
    this.sessions.push(s);
    return s;
  }

  async getSessionsByUser(userId: number) {
    return this.sessions
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createReview(userId: number, data: { rating: number; comment: string }) {
    const r: Review = {
      id: this.rid++,
      userId,
      ...data,
      createdAt: new Date(),
    };
    this.reviews.push(r);
    return r;
  }

  async getReviews() {
    return this.reviews.map(r => ({
      ...r,
      username: this.users.get(r.userId)?.username ?? "Unknown",
    }));
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MockStorage();
