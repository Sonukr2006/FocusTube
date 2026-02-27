import { Router } from "express";
import {
  getUserById,
  signInUser,
  signUpUser,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", signUpUser);
router.post("/signin", signInUser);
router.get("/:userId", verifyJWT, getUserById);

export default router;
