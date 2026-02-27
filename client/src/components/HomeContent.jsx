import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import Todoes from "./HomesContent/Todoes.jsx";
import TodoesList from "./HomesContent/TodoesList.jsx";
import { Button } from "./ui/button";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodoStatus,
} from "@/lib/todos";

const HomeContent = () => {
  const { userId: routeUserId } = useParams();
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [todoToDeleteId, setTodoToDeleteId] = useState("");

  const storedUser = useMemo(() => {
    const rawUser = localStorage.getItem("focustube_user");
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }, []);

  const userId = routeUserId || storedUser?._id || "";

  useEffect(() => {
    const fetchTodos = async () => {
      if (!userId) {
        setTodos([]);
        setIsLoading(false);
        setError("User session not found. Please login again.");
        return;
      }

      try {
        setError("");
        setIsLoading(true);
        const response = await getTodos();
        setTodos(response?.data || []);
      } catch (requestError) {
        setError(requestError.message || "Unable to fetch todos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodos();
  }, [userId]);

  const handleAddTodo = async ({ title, description }) => {
    if (!userId) {
      const message = "User session not found. Please login again.";
      setError(message);
      alert(message);
      return false;
    }

    setIsSaving(true);

    try {
      const response = await createTodo({
        title,
        description,
      });
      const createdTodo = response?.data;
      if (createdTodo) {
        setTodos((prev) => [createdTodo, ...prev]);
      }
      setShowTodoInput(false);
      alert(response?.message || "Todo created successfully.");
      return true;
    } catch (requestError) {
      const message = requestError.message || "Unable to create todo";
      setError(message);
      alert(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTodo = async (id, checked) => {
    const nextCompleted = checked === true;
    const previousTodos = [...todos];

    setTodos((prev) =>
      prev.map((todo) =>
        todo._id === id ? { ...todo, completed: nextCompleted } : todo
      )
    );

    try {
      await updateTodoStatus(id, nextCompleted);
    } catch (requestError) {
      setTodos(previousTodos);
      const message = requestError.message || "Unable to update todo";
      setError(message);
      alert(message);
    }
  };

  const handleDeleteTodo = (id) => {
    setTodoToDeleteId(id);
  };

  const cancelDeleteTodo = () => {
    if (isDeleting) return;
    setTodoToDeleteId("");
  };

  const confirmDeleteTodo = async () => {
    if (!todoToDeleteId) return;

    setIsDeleting(true);
    const deletingTodoId = todoToDeleteId;
    const previousTodos = [...todos];
    setTodos((prev) => prev.filter((todo) => todo._id !== deletingTodoId));

    try {
      await deleteTodo(deletingTodoId);
      setTodoToDeleteId("");
    } catch (requestError) {
      setTodos(previousTodos);
      const message = requestError.message || "Unable to delete todo";
      setError(message);
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 justify-center items-center">
      {showTodoInput ? (
        <Todoes
          onAdd={handleAddTodo}
          onCancel={() => setShowTodoInput(false)}
          isSaving={isSaving}
        />
      ) : (
        <TodoesList
          todos={todos}
          isLoading={isLoading}
          error={error}
          setShowTodoInput={setShowTodoInput}
          onToggleComplete={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
        />
      )}

      {todoToDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Delete Todo</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this todo? This action cannot be
              undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelDeleteTodo}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteTodo}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HomeContent;
