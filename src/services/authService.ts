import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
if (!JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not defined");

const generateAccessToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "15m" }); // 👈 shortened to 15 mins
};

const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const registerUser = async (email: string, nin: string, password: string) => {
  if (!/^\d{11}$/.test(nin)) {
    throw new Error("NIN must be exactly 11 digits");
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { nin }] },
  });

  if (existing) throw new Error("Email or NIN already registered");

  const hashedPassword = await bcrypt.hash(password, 12);

  const { password: _, ...user } = await prisma.user.create({
    data: { email, nin, password: hashedPassword },
  });

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken();

  // Store refresh token in DB with 7 day expiry
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { password: _, ...userWithoutPassword } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  // Find token in DB
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored) throw new Error("Invalid refresh token");

  // Check if token has expired
  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    throw new Error("Refresh token expired, please login again");
  }

  // Rotate refresh token — delete old, issue new
  await prisma.refreshToken.delete({ where: { token: refreshToken } });

  const newRefreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: stored.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const newAccessToken = generateAccessToken(stored.user.id, stored.user.role);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutUser = async (refreshToken: string) => {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!stored) throw new Error("Invalid refresh token");

  await prisma.refreshToken.delete({ where: { token: refreshToken } });
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nin: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new Error("User not found");
  return user;
};