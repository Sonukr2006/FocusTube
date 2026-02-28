import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { signIn, signUp } from "@/lib/auth";

const AUTH_USER_KEY = "focustube_user";
const AUTH_TOKEN_KEY = "focustube_access_token";

const loadStoredAuth = () => {
  if (typeof window === "undefined") {
    return {
      user: null,
      accessToken: "",
    };
  }

  try {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    const rawToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
    const user = rawUser ? JSON.parse(rawUser) : null;
    return {
      user,
      accessToken: rawToken,
    };
  } catch {
    return {
      user: null,
      accessToken: "",
    };
  }
};

const persistAuth = (user, accessToken) => {
  if (typeof window === "undefined") return;

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }

  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

const storedAuth = loadStoredAuth();

const initialState = {
  user: storedAuth.user,
  accessToken: storedAuth.accessToken,
  isAuthenticated: Boolean(storedAuth.user && storedAuth.accessToken),
  isLoading: false,
  error: "",
};

export const signInUserThunk = createAsyncThunk(
  "auth/signIn",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await signIn(payload);
      const user = response?.data?.user || null;
      const accessToken = response?.data?.accessToken || "";
      if (!user || !accessToken) {
        return rejectWithValue("Invalid login response");
      }

      return {
        user,
        accessToken,
        message: response?.message || "Login successful.",
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to login");
    }
  }
);

export const signUpUserThunk = createAsyncThunk(
  "auth/signUp",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await signUp(payload);
      const user = response?.data?.user || null;
      const accessToken = response?.data?.accessToken || "";
      if (!user || !accessToken) {
        return rejectWithValue("Invalid signup response");
      }

      return {
        user,
        accessToken,
        message: response?.message || "Account created successfully.",
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to create account");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutUser(state) {
      state.user = null;
      state.accessToken = "";
      state.isAuthenticated = false;
      state.error = "";
      persistAuth(null, "");
    },
    clearAuthError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInUserThunk.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(signInUserThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = "";
        persistAuth(action.payload.user, action.payload.accessToken);
      })
      .addCase(signInUserThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Unable to login";
      })
      .addCase(signUpUserThunk.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(signUpUserThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = "";
        persistAuth(action.payload.user, action.payload.accessToken);
      })
      .addCase(signUpUserThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Unable to create account";
      });
  },
});

export const { logoutUser, clearAuthError } = authSlice.actions;

export const selectAuthState = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
