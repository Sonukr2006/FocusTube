import { Router } from "express";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodoStatus,
} from "../controllers/todo.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getTodos);
router.post("/", createTodo);
router.patch("/:id", updateTodoStatus);
router.delete("/:id", deleteTodo);

export default router;
