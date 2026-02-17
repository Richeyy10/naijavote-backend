import { Router } from "express";
import { register, login, refresh, logout, getMe } from "../controllers/authController";
import { protect } from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validate";
import { authLimiter } from "../middlewares/rateLimiter";
import { registerSchema, loginSchema } from "../validators/authValidators";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

export default router;