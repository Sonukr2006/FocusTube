const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const getUserProfile = async (userId) => {
  const token = localStorage.getItem("focustube_access_token");

  const response = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(userId)}`,
    {
      credentials: "include",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch user profile");
  }

  return data;
};
