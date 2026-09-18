const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/users";

const AUTH_USER_KEY = "focustube_user";
const AUTH_TOKEN_KEY = "focustube_access_token";

const persistAuthToStorage = (user, accessToken) => {
  if (typeof window === "undefined") return;

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  }
};

const requestAuth = async (endpoint, payload) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    const rawText = await response.text().catch(() => "");
    data = rawText ? { message: rawText } : {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Authentication request failed (${response.status})`
    );
  }

  return data;
};

export const signIn = (payload) => requestAuth("/signin", payload);
export const signUp = (payload) => requestAuth("/signup", payload);

export const refreshSession = async () => {
  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    const rawText = await response.text().catch(() => "");
    data = rawText ? { message: rawText } : {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Session refresh failed (${response.status})`
    );
  }

  const user = data?.data?.user || null;
  const accessToken = data?.data?.accessToken || "";
  if (user && accessToken) {
    persistAuthToStorage(user, accessToken);
  }

  return data;
};

export const logoutSession = async () => {
  const response = await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Logout failed");
  }

  return data;
};
