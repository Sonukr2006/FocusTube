import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Todoes from "./HomesContent/Todoes.jsx";
import TodoesList from "./HomesContent/TodoesList.jsx";
import { Button } from "./ui/button";
import { useDispatch, useSelector } from "react-redux";
import {
  createTodoThunk,
  deleteTodoThunk,
  fetchTodosThunk,
  selectTodosState,
  updateTodoStatusThunk,
} from "@/store/slices/todosSlice";
import { selectCurrentUser } from "@/store/slices/authSlice";

const HomeContent = () => {
  const dispatch = useDispatch();
  const { userId: routeUserId } = useParams();
  const currentUser = useSelector(selectCurrentUser);
  const { items: todos, isLoading, isSaving, isDeleting, error: storeError } =
    useSelector(selectTodosState);
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [localError, setLocalError] = useState("");
  const [todoToDeleteId, setTodoToDeleteId] = useState("");

  const authUserId = currentUser?._id ? String(currentUser._id) : "";
  const normalizedRouteUserId = routeUserId ? String(routeUserId) : "";
  const userId = normalizedRouteUserId || authUserId;
  const isValidUserSession =
    Boolean(userId) &&
    (!normalizedRouteUserId ||
      (Boolean(authUserId) && normalizedRouteUserId === authUserId));

  useEffect(() => {
    const fetchTodos = async () => {
      if (!isValidUserSession) {
        setLocalError("User session not found. Please login again.");
        return;
      }

      try {
        setLocalError("");
        await dispatch(fetchTodosThunk()).unwrap();
      } catch (requestError) {
        const message =
          typeof requestError === "string"
            ? requestError
            : requestError?.message || "Unable to fetch todos";
        setLocalError(message);
      }
    };

    fetchTodos();
  }, [dispatch, isValidUserSession]);

  const handleAddTodo = async ({ title, description }) => {
    if (!isValidUserSession) {
      const message = "User session not found. Please login again.";
      setLocalError(message);
      alert(message);
      return false;
    }

    try {
      const response = await dispatch(
        createTodoThunk({ title, description })
      ).unwrap();
      setShowTodoInput(false);
      alert(response?.message || "Todo created successfully.");
      return true;
    } catch (requestError) {
      const message =
        typeof requestError === "string"
          ? requestError
          : requestError?.message || "Unable to create todo";
      setLocalError(message);
      alert(message);
      return false;
    }
  };

  const handleToggleTodo = async (id, checked) => {
    try {
      await dispatch(
        updateTodoStatusThunk({ id, completed: checked === true })
      ).unwrap();
    } catch (requestError) {
      const message =
        typeof requestError === "string"
          ? requestError
          : requestError?.message || "Unable to update todo";
      setLocalError(message);
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

    const deletingTodoId = todoToDeleteId;

    try {
      await dispatch(deleteTodoThunk(deletingTodoId)).unwrap();
      setTodoToDeleteId("");
    } catch (requestError) {
      const message =
        typeof requestError === "string"
          ? requestError
          : requestError?.message || "Unable to delete todo";
      setLocalError(message);
      alert(message);
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
          error={localError || storeError}
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
