import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes";
import electionRoutes from "./routes/electionRoutes";
import voteRoutes from "./routes/voteRoutes";
import { globalLimiter } from "./middlewares/rateLimiter";

const app = express();

// Security middleware
app.use(helmet());
app.use(globalLimiter);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/votes", voteRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "NaijaVote API Running 🇳🇬" });
});

const PORT: number = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});