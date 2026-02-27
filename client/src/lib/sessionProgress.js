const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("focustube_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestSessionProgress = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/sessions${endpoint}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Session progress request failed");
  }

  return data;
};

export const getSessionProgress = (playlistId) =>
  requestSessionProgress(`/progress/${encodeURIComponent(playlistId)}`);

export const saveSessionProgress = (playlistId, payload) =>
  requestSessionProgress(`/progress/${encodeURIComponent(playlistId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const clearSessionProgress = (playlistId) =>
  requestSessionProgress(`/progress/${encodeURIComponent(playlistId)}`, {
    method: "DELETE",
  });

export const getSessionHistory = (limit = 10) =>
  requestSessionProgress(`/history?limit=${encodeURIComponent(limit)}`);
