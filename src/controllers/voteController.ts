import { Response } from "express";
import * as voteService from "../services/voteService";
import { AuthRequest } from "../middlewares/authMiddleware";

export const castVote = async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, candidateId } = req.body;
    const voterId = req.user!.id;

    if (!electionId || !candidateId) {
      return res.status(400).json({ error: "electionId and candidateId are required" });
    }

    const result = await voteService.castVote(voterId, electionId, candidateId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    const results = await voteService.getElectionResults(electionId);
    res.status(200).json(results);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const verifyChain = async (req: AuthRequest, res: Response) => {
  try {
    const electionId = req.params.electionId as string;
    const result = await voteService.verifyVoteChain(electionId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};