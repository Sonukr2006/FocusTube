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

const TodoesList = ({
  todos,
  isLoading,
  error,
  setShowTodoInput,
  onToggleComplete,
  onDeleteTodo,
}) => {
  const handleShowTodoInput = () => setShowTodoInput(true);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Todo List</CardTitle>
        <CardDescription>Your saved todos from backend</CardDescription>
        <CardAction>
          <Button onClick={handleShowTodoInput}>Add</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading todos...</p> : null}
        {!isLoading && error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : null}
        {!isLoading && !error && todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No todos yet. Add your first one.
          </p>
        ) : null}
        {todos.map((todo) => (
          <div key={todo._id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`todo-${todo._id}`}
                  checked={todo.completed}
                  onCheckedChange={(checked) =>
                    onToggleComplete(todo._id, checked)
                  }
                />
                <p className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                  {todo.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={todo.completed ? "secondary" : "outline"}>
                  {todo.completed ? "Completed" : "Not Completed"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteTodo(todo._id)}
                >
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{todo.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TodoesList;
