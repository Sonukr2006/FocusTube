import { useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";

const staticTodos = [
  {
    id: 1,
    title: "Design dashboard UI",
    description: "Finish first draft of home dashboard layout.",
    completed: false,
  },
  {
    id: 2,
    title: "Setup API routes",
    description: "Create basic CRUD routes for todos.",
    completed: false,
  },
  {
    id: 3,
    title: "Deploy preview build",
    description: "Push latest changes and verify staging link.",
    completed: true,
  },
];




const TodoesList = ({ showTodoInput, setShowTodoInput }) => {
  const [todos, setTodos] = useState(staticTodos);

  const handleToggleComplete = (id, checked) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: checked === true } : todo,
      ),
    );
  };

  const handleShowTodoInput = () => {
    setShowTodoInput(true);
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Todo List</CardTitle>
        <CardDescription>Static sample todos</CardDescription>
        <CardAction>
          <Button onClick={handleShowTodoInput}>Add</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pt-4 sm:px-6 sm:pt-6">
        {todos.map((todo) => (
          <div key={todo.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`todo-${todo.id}`}
                  checked={todo.completed}
                  onCheckedChange={(checked) =>
                    handleToggleComplete(todo.id, checked)
                  }
                />
                <p className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                  {todo.title}
                </p>
              </div>
              <Badge variant={todo.completed ? "secondary" : "outline"}>
                {todo.completed ? "Completed" : "Not Completed"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{todo.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TodoesList;
