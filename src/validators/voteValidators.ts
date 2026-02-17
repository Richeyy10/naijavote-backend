import { z } from "zod";

export const castVoteSchema = z.object({
  electionId: z
    .string()
    .uuid("Invalid election ID format"),
  candidateId: z
    .string()
    .uuid("Invalid candidate ID format"),
});