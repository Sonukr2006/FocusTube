import mongoose from "mongoose";
import { Todo } from "../models/todo.model.js";

const sanitizeTodo = (todo) => ({
  _id: todo._id,
  title: todo.title,
  description: todo.description,
  completed: todo.completed,
  userId: todo.userId,
  userEmail: todo.userEmail,
  createdAt: todo.createdAt,
  updatedAt: todo.updatedAt,
});

export const getTodos = async (req, res) => {
  try {
    const userId = req.user?.userid;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    const query = { userId };
    const todos = await Todo.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: todos.map(sanitizeTodo),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch todos",
      error: error.message,
    });
  }
};

export const createTodo = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const description = req.body.description?.trim() || "";
    const userId = req.user?.userid;
    const userEmail = req.user?.email?.toLowerCase().trim() || "";

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    const todo = await Todo.create({
      title,
      description,
      userId,
      userEmail,
    });

    return res.status(201).json({
      success: true,
      message: "Todo created successfully",
      data: sanitizeTodo(todo),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create todo",
      error: error.message,
    });
  }
};

export const updateTodoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const userId = req.user?.userid;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid todo id",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId },
      { completed: completed === true },
      { new: true }
    );

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      data: sanitizeTodo(todo),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update todo",
      error: error.message,
    });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userid;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid todo id",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    const todo = await Todo.findOneAndDelete({ _id: id, userId });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete todo",
      error: error.message,
    });
  }
};
