const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/users";

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
