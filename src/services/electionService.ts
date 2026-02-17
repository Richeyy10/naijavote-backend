import prisma from "../config/prisma";
import { ElectionStatus } from "@prisma/client";

interface CreateElectionInput {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
}

export const createElection = async (data: CreateElectionInput) => {
  if (data.startDate >= data.endDate) {
    throw new Error("End date must be after start date");
  }

  if (data.startDate < new Date()) {
    throw new Error("Start date cannot be in the past");
  }

  const election = await prisma.election.create({
    data: {
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });

  return election;
};

export const getAllElections = async () => {
  const elections = await prisma.election.findMany({
    include: {
      candidates: true,
      _count: {
        select: { votes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return elections;
};

export const getElectionById = async (id: string) => {
  const election = await prisma.election.findUnique({
    where: { id },
    include: {
      candidates: {
        include: {
          _count: {
            select: { votes: true },
          },
        },
      },
      _count: {
        select: { votes: true },
      },
    },
  });

  if (!election) throw new Error("Election not found");

  return election;
};

export const updateElectionStatus = async (id: string, status: ElectionStatus) => {
  // Validate status is a valid enum value
  if (!Object.values(ElectionStatus).includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${Object.values(ElectionStatus).join(", ")}`);
  }

  const election = await prisma.election.findUnique({ where: { id } });
  if (!election) throw new Error("Election not found");

  // Enforce valid status transitions
  const validTransitions: Record<ElectionStatus, ElectionStatus[]> = {
    DRAFT: [ElectionStatus.OPEN],
    OPEN: [ElectionStatus.CLOSED],
    CLOSED: [],
  };

  if (!validTransitions[election.status].includes(status)) {
    throw new Error(
      `Cannot transition from ${election.status} to ${status}`
    );
  }

  const updated = await prisma.election.update({
    where: { id },
    data: { status },
  });

  return updated;
};

export const addCandidate = async (
  electionId: string,
  data: { name: string; party: string }
) => {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });

  if (!election) throw new Error("Election not found");

  if (election.status !== "DRAFT") {
    throw new Error("Candidates can only be added to elections in DRAFT status");
  }

  // Prevent duplicate candidate from same party in same election
  const existing = await prisma.candidate.findFirst({
    where: {
      electionId,
      party: { equals: data.party, mode: "insensitive" },
    },
  });

  if (existing) {
    throw new Error(`A candidate from ${data.party} already exists in this election`);
  }

  const candidate = await prisma.candidate.create({
    data: {
      name: data.name,
      party: data.party,
      electionId,
    },
  });

  return candidate;
};

export const removeCandidate = async (candidateId: string) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { election: true },
  });

  if (!candidate) throw new Error("Candidate not found");

  if (candidate.election.status !== "DRAFT") {
    throw new Error("Candidates can only be removed from elections in DRAFT status");
  }

  await prisma.candidate.delete({ where: { id: candidateId } });
};