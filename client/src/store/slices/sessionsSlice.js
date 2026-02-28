import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getSessionHistory,
  getSessionProgress,
  saveSessionProgress,
} from "@/lib/sessionProgress";

const initialState = {
  history: [],
  isHistoryLoading: false,
  historyError: "",
  progressById: {},
};

export const fetchSessionHistoryThunk = createAsyncThunk(
  "sessions/fetchHistory",
  async (limit = 10, { rejectWithValue }) => {
    try {
      const response = await getSessionHistory(limit);
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to load session history.");
    }
  }
);

export const fetchSessionProgressThunk = createAsyncThunk(
  "sessions/fetchProgress",
  async (playlistId, { rejectWithValue }) => {
    try {
      const response = await getSessionProgress(playlistId);
      return {
        playlistId,
        progress: response?.data || null,
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to load session progress.");
    }
  }
);

export const saveSessionProgressThunk = createAsyncThunk(
  "sessions/saveProgress",
  async ({ playlistId, payload }, { rejectWithValue }) => {
    try {
      const response = await saveSessionProgress(playlistId, payload);
      return {
        playlistId,
        progress: response?.data || null,
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to save session progress.");
    }
  }
);

const sessionsSlice = createSlice({
  name: "sessions",
  initialState,
  reducers: {
    clearSessionState(state) {
      state.history = [];
      state.isHistoryLoading = false;
      state.historyError = "";
      state.progressById = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessionHistoryThunk.pending, (state) => {
        state.isHistoryLoading = true;
        state.historyError = "";
      })
      .addCase(fetchSessionHistoryThunk.fulfilled, (state, action) => {
        state.isHistoryLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchSessionHistoryThunk.rejected, (state, action) => {
        state.isHistoryLoading = false;
        state.historyError =
          action.payload || "Unable to load session history.";
      })
      .addCase(fetchSessionProgressThunk.fulfilled, (state, action) => {
        const { playlistId, progress } = action.payload;
        state.progressById[playlistId] = progress;
      })
      .addCase(saveSessionProgressThunk.fulfilled, (state, action) => {
        const { playlistId, progress } = action.payload;
        state.progressById[playlistId] = progress;
      });
  },
});

export const { clearSessionState } = sessionsSlice.actions;

export const selectSessionState = (state) => state.sessions;
export const selectSessionHistory = (state) => state.sessions.history;
export const selectSessionHistoryLoading = (state) =>
  state.sessions.isHistoryLoading;
export const selectSessionHistoryError = (state) => state.sessions.historyError;
export const selectSessionProgressById = (state, playlistId) =>
  state.sessions.progressById[playlistId] || null;

export default sessionsSlice.reducer;
