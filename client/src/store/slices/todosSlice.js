import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodoStatus,
} from "@/lib/todos";

const initialState = {
  items: [],
  isLoading: false,
  isSaving: false,
  isDeleting: false,
  error: "",
};

export const fetchTodosThunk = createAsyncThunk(
  "todos/fetchTodos",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTodos();
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to fetch todos");
    }
  }
);

export const createTodoThunk = createAsyncThunk(
  "todos/createTodo",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await createTodo(payload);
      return {
        todo: response?.data || null,
        message: response?.message || "Todo created successfully.",
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to create todo");
    }
  }
);

export const updateTodoStatusThunk = createAsyncThunk(
  "todos/updateTodoStatus",
  async ({ id, completed }, { rejectWithValue }) => {
    try {
      const response = await updateTodoStatus(id, completed);
      return response?.data || null;
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to update todo");
    }
  }
);

export const deleteTodoThunk = createAsyncThunk(
  "todos/deleteTodo",
  async (id, { rejectWithValue }) => {
    try {
      await deleteTodo(id);
      return id;
    } catch (error) {
      return rejectWithValue(error?.message || "Unable to delete todo");
    }
  }
);

const todosSlice = createSlice({
  name: "todos",
  initialState,
  reducers: {
    clearTodosState(state) {
      state.items = [];
      state.isLoading = false;
      state.isSaving = false;
      state.isDeleting = false;
      state.error = "";
    },
    clearTodosError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodosThunk.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(fetchTodosThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTodosThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Unable to fetch todos";
      })
      .addCase(createTodoThunk.pending, (state) => {
        state.isSaving = true;
        state.error = "";
      })
      .addCase(createTodoThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        if (action.payload.todo) {
          state.items.unshift(action.payload.todo);
        }
      })
      .addCase(createTodoThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload || "Unable to create todo";
      })
      .addCase(updateTodoStatusThunk.fulfilled, (state, action) => {
        const updatedTodo = action.payload;
        if (!updatedTodo?._id) return;

        const todoIndex = state.items.findIndex(
          (todo) => todo._id === updatedTodo._id
        );
        if (todoIndex >= 0) {
          state.items[todoIndex] = updatedTodo;
        }
      })
      .addCase(updateTodoStatusThunk.rejected, (state, action) => {
        state.error = action.payload || "Unable to update todo";
      })
      .addCase(deleteTodoThunk.pending, (state) => {
        state.isDeleting = true;
        state.error = "";
      })
      .addCase(deleteTodoThunk.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.items = state.items.filter((todo) => todo._id !== action.payload);
      })
      .addCase(deleteTodoThunk.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload || "Unable to delete todo";
      });
  },
});

export const { clearTodosState, clearTodosError } = todosSlice.actions;

export const selectTodosState = (state) => state.todos;
export const selectTodos = (state) => state.todos.items;
export const selectTodosLoading = (state) => state.todos.isLoading;
export const selectTodosError = (state) => state.todos.error;

export default todosSlice.reducer;
