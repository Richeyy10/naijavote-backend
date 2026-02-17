import { Router } from "express";
import { castVote, getResults, verifyChain } from "../controllers/voteController";
import { protect, isAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { voteLimiter } from "../middlewares/rateLimiter";
import { castVoteSchema } from "../validators/voteValidators";

const router = Router();

router.post("/", protect, voteLimiter, validate(castVoteSchema), castVote);
router.get("/:electionId/results", protect, isAdmin, getResults);
router.get("/:electionId/verify", protect, isAdmin, verifyChain);

export default router;