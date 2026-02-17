import { Router } from "express";
import {
  createElection,
  getAllElections,
  getElectionById,
  updateElectionStatus,
  addCandidate,
  removeCandidate,
} from "../controllers/electionController";
import { protect, isAdmin } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import {
  createElectionSchema,
  updateStatusSchema,
  addCandidateSchema,
} from "../validators/electionValidators";

const router = Router();

// Public
router.get("/", getAllElections);
router.get("/:id", getElectionById);

// Admin only
router.post("/", protect, isAdmin, validate(createElectionSchema), createElection);
router.patch("/:id/status", protect, isAdmin, validate(updateStatusSchema), updateElectionStatus);
router.post("/:id/candidates", protect, isAdmin, validate(addCandidateSchema), addCandidate);
router.delete("/candidates/:candidateId", protect, isAdmin, removeCandidate);

export default router;