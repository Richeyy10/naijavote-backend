import { z } from "zod";

export const createElectionSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must not exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must not exceed 500 characters"),
  startDate: z
    .string()
    .datetime("Invalid start date format — use ISO 8601"),
  endDate: z
    .string()
    .datetime("Invalid end date format — use ISO 8601"),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "CLOSED"], {
    error: "Status must be DRAFT, OPEN, or CLOSED",  // 👈 error not errorMap
  }),
});

export const addCandidateSchema = z.object({
  name: z
    .string()
    .min(2, "Candidate name must be at least 2 characters")
    .max(100, "Candidate name must not exceed 100 characters"),
  party: z
    .string()
    .min(2, "Party name must be at least 2 characters")
    .max(100, "Party name must not exceed 100 characters"),
});