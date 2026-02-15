import type { Express, RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { db } from "../db";
import { users, type User, type PublicUser } from "@shared/models/auth";
import { eq } from "drizzle-orm";

// Hash password using SHA256 with salt
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + actualSalt)
    .digest("hex");
  return { hash: `${actualSalt}:${hash}`, salt: actualSalt };
}

// Verify password
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const { hash: computedHash } = hashPassword(password, salt);
  const [, newHash] = computedHash.split(":");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(newHash));
  } catch {
    return false;
  }
}

// Get user by email
async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user;
}

// Get user by ID
async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

// Create user
async function createUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
}): Promise<User> {
  const { hash } = hashPassword(data.password);
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      password: hash,
      firstName: data.firstName,
      lastName: data.lastName,
      businessName: data.businessName,
      phone: data.phone,
    })
    .returning();
  return user;
}

// Remove password from user object
function toPublicUser(user: User): PublicUser {
  const { password, ...publicUser } = user;
  return publicUser;
}

// Setup authentication
export async function setupAuth(app: Express): Promise<void> {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "livepay-session-secret-change-in-production",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Email ou mot de passe incorrect" });
          }
          if (!verifyPassword(password, user.password)) {
            return done(null, false, { message: "Email ou mot de passe incorrect" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await getUserById(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });
}

// Register auth routes
export function registerAuthRoutes(app: Express): void {
  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, businessName, phone } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      const user = await createUser({ email, password, firstName, lastName, businessName, phone });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erreur lors de la connexion" });
        }
        return res.status(201).json(toPublicUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Email ou mot de passe incorrect" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Erreur lors de la connexion" });
        }
        return res.json(toPublicUser(user));
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      req.session.destroy((destroyErr) => {
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    res.json(toPublicUser(req.user as User));
  });

  // Update profile
  app.patch("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { firstName, lastName, businessName, phone } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: firstName ?? user.firstName,
          lastName: lastName ?? user.lastName,
          businessName: businessName ?? user.businessName,
          phone: phone ?? user.phone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      res.json(toPublicUser(updatedUser));
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Non authentifié" });
};

// Auth storage for backward compatibility
export const authStorage = {
  async getUser(id: string): Promise<PublicUser | undefined> {
    const user = await getUserById(id);
    return user ? toPublicUser(user) : undefined;
  },
};
