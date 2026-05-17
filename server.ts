import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false, // For development and iframe compatibility
  }));
  app.use(morgan("dev"));
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "premium", timestamp: new Date() });
  });

  // TODO: Search Proxy for Google Shopping / Amazon
  app.post("/api/recommendations/search", async (req, res) => {
    const { query, category, budget } = req.body;
    // In a real app, this would call Google Shopping or Amazon API
    // Mocking for now but with realistic structures
    res.json({
      items: [
        {
          id: "1",
          title: `Premium ${category || 'Fashion'} Item`,
          brand: "Aura Essentials",
          price: "$120",
          image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400",
          link: "#",
          rating: 4.8
        }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aura AI] Server running at http://localhost:${PORT}`);
  });
}

startServer();
