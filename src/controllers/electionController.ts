import { Response } from "express";
import * as electionService from "../services/electionService";
import { AuthRequest } from "../middlewares/authMiddleware";

export const createElection = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, startDate, endDate } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const election = await electionService.createElection({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.status(201).json({ message: "Election created", election });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllElections = async (req: AuthRequest, res: Response) => {
  try {
    const elections = await electionService.getAllElections();
    res.status(200).json({ elections });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getElectionById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const election = await electionService.getElectionById(id);
    res.status(200).json({ election });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
};

export const updateElectionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const election = await electionService.updateElectionStatus(id, status);
    res.status(200).json({ message: "Election status updated", election });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const addCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, party } = req.body;

    if (!name || !party) {
      return res.status(400).json({ error: "Candidate name and party are required" });
    }

    const candidate = await electionService.addCandidate(id, { name, party });
    res.status(201).json({ message: "Candidate added", candidate });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const removeCandidate = async (req: AuthRequest, res: Response) => {
  try {
    const candidateId = req.params.candidateId as string;
    await electionService.removeCandidate(candidateId);
    res.status(200).json({ message: "Candidate removed" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};