import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-123";

// Database setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Database
const initDb = async () => {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      );
    `);
    client.release();
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization failed. Ensure Postgres is running.");
    console.error(err);
  }
};

async function startServer() {
  await initDb();
  
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Global Logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  app.post("/api/auth/signup", async (req, res) => {
    console.log("Signup request received:", req.body.email);
    const { email, password } = req.body;
    try {
      // Check if this is the first user
      const userCountRes = await pool.query("SELECT COUNT(*) FROM users");
      const isFirstUser = parseInt(userCountRes.rows[0].count) === 0;

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (email, password, status, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, email, status, is_admin",
        [email, hashedPassword, isFirstUser ? 'approved' : 'pending', isFirstUser]
      );
      
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true }).json({ user });
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === '23505') {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Signup failed" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    console.log("Login request received:", req.body.email);
    const { email, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status !== 'approved') {
        return res.status(403).json({ error: `Account ${user.status}. Please contact an administrator.` });
      }

      const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true }).json({ 
        user: { id: user.id, email: user.email, is_admin: user.is_admin, status: user.status } 
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // --- Admin Routes ---
  const adminOnly = (req: any, res: any, next: any) => {
    if (!req.user?.is_admin) return res.status(403).json({ error: "Admin access required" });
    next();
  };

  app.get("/api/admin/users", authenticate, adminOnly, async (req, res) => {
    try {
      const result = await pool.query("SELECT id, email, is_admin, status, created_at FROM users ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/status", authenticate, adminOnly, async (req, res) => {
    const { status } = req.body;
    try {
      await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token").json({ message: "Logged out" });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not logged in" });
    try {
      const user = jwt.verify(token, JWT_SECRET);
      res.json({ user });
    } catch (err) {
      res.status(401).json({ error: "Session expired" });
    }
  });

  // --- Chat Routes ---
  app.get("/api/chats", authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC",
        [req.user.id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  app.post("/api/chats", authenticate, async (req: any, res) => {
    const { title, model } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO chats (user_id, title, model) VALUES ($1, $2, $3) RETURNING *",
        [req.user.id, title, model]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to create chat" });
    }
  });

  app.get("/api/chats/:id/messages", authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC",
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chats/:id/messages", authenticate, async (req: any, res) => {
    const { role, content, timestamp } = req.body;
    try {
      await pool.query(
        "INSERT INTO messages (chat_id, role, content, timestamp) VALUES ($1, $2, $3, $4)",
        [req.params.id, role, content, timestamp]
      );
      await pool.query(
        "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  app.post("/api/chats/:id/title", authenticate, async (req: any, res) => {
    const { title } = req.body;
    try {
      await pool.query(
        "UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3",
        [title, req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update title" });
    }
  });

  app.delete("/api/chats/:id", authenticate, async (req: any, res) => {
    try {
      await pool.query("DELETE FROM chats WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete chat" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`MN155 Server running at http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

startServer();
