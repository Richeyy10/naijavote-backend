import dotenv from "dotenv";
dotenv.config();

import prisma from "../config/prisma";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

const encryptVote = (candidateId: string): string => {
  const secret = process.env.VOTE_ENCRYPTION_KEY!;
  // Key must be 32 bytes for aes-256-cbc
  const key = crypto.createHash("sha256").update(secret).digest();
  // IV must be 16 bytes — random for each encryption
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(candidateId, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Prepend IV to encrypted output so we can decrypt later
  return iv.toString("hex") + ":" + encrypted;
};

const generateVoteHash = (
  voterId: string,
  electionId: string,
  candidateId: string,
  timestamp: string
): string => {
  return crypto
    .createHash("sha256")
    .update(`${voterId}${electionId}${candidateId}${timestamp}`)
    .digest("hex");
};

const getLastVoteHash = async (electionId: string): Promise<string | null> => {
  const lastVote = await prisma.vote.findFirst({
    where: { electionId },
    orderBy: { createdAt: "desc" },
    select: { voteHash: true },
  });
  return lastVote?.voteHash ?? null;
};

export const castVote = async (
  voterId: string,
  electionId: string,
  candidateId: string
) => {
  // 1. Verify election exists and is OPEN
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });

  if (!election) throw new Error("Election not found");
  if (election.status !== "OPEN") {
    throw new Error("This election is not currently open for voting");
  }

  // 2. Verify election is within voting window
  const now = new Date();
  if (now < election.startDate) {
    throw new Error("Voting has not started yet");
  }
  if (now > election.endDate) {
    throw new Error("Voting has closed for this election");
  }

  // 3. Verify candidate exists and belongs to this election
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, electionId },
  });

  if (!candidate) {
    throw new Error("Candidate not found in this election");
  }

  // 4. Check user hasn't already voted in this election
  const existingVote = await prisma.vote.findUnique({
    where: { voterId_electionId: { voterId, electionId } },
  });

  if (existingVote) {
    throw new Error("You have already voted in this election");
  }

  // 5. Generate vote hash and chain
  const timestamp = now.toISOString();
  const voteHash = generateVoteHash(voterId, electionId, candidateId, timestamp);
  const previousHash = await getLastVoteHash(electionId);
  const encryptedVote = encryptVote(candidateId);

  // 6. Cast vote in a transaction — all or nothing
  const vote = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  return await tx.vote.create({
    data: {
      voterId,
      electionId,
      candidateId,
      encryptedVote,
      voteHash,
      previousHash,
    },
  });
});

  return {
    message: "Vote cast successfully",
    receipt: {
      voteHash,
      electionId,
      timestamp,
    },
  };
};

export const getElectionResults = async (electionId: string) => {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
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

  if (election.status !== "CLOSED") {
    throw new Error("Results are only available after the election is closed");
  }

  const results = election.candidates
  .map((candidate: any) => ({
    id: candidate.id,
    name: candidate.name,
    party: candidate.party,
    votes: candidate._count.votes,
  }))
  .sort((a: any, b: any) => b.votes - a.votes);

  const totalVotes = election._count.votes;
  const winner = results[0];

  return {
    election: {
      id: election.id,
      title: election.title,
      status: election.status,
      totalVotes,
    },
    winner,
    results,
  };
};

export const verifyVoteChain = async (electionId: string) => {
  const votes = await prisma.vote.findMany({
    where: { electionId },
    orderBy: { createdAt: "asc" },
    select: {
      voteHash: true,
      previousHash: true,
      createdAt: true,
    },
  });

  if (votes.length === 0) {
    return { valid: true, message: "No votes cast yet", totalVotes: 0 };
  }

  // Verify chain integrity — each vote's previousHash must match
  // the voteHash of the vote before it
  let chainValid = true;
  for (let i = 1; i < votes.length; i++) {
    if (votes[i].previousHash !== votes[i - 1].voteHash) {
      chainValid = false;
      break;
    }
  }

  return {
    valid: chainValid,
    message: chainValid ? "Vote chain is intact" : "Vote chain integrity compromised",
    totalVotes: votes.length,
  };
};