import { refreshSession } from "@/lib/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("focustube_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestTodos = async (endpoint, options = {}) => {
  const doRequest = async () => {
    const response = await fetch(`${API_BASE_URL}/todos${endpoint}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  let { response, data } = await doRequest();
  if (response.status === 401) {
    try {
      await refreshSession();
      ({ response, data } = await doRequest());
    } catch (error) {
      throw new Error(
        data?.message || error?.message || "Todo request failed"
      );
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || "Todo request failed");
  }

  return data;
};

export const getTodos = () => requestTodos("");

export const createTodo = (payload) =>
  requestTodos("", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTodoStatus = (id, completed) =>
  requestTodos(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });

export const deleteTodo = (id) =>
  requestTodos(`/${id}`, {
    method: "DELETE",
  });
