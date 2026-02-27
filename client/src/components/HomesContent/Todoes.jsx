import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

const Todoes = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = (event) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setTitle("");
    setDescription("");
  };

  return (
    <div>
      <Card className="@container/card flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-lg font-semibold">
            Add Todo
          </CardTitle>
          
        </CardHeader>
        <CardContent className="px-3 pt-4 sm:px-6 sm:pt-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="todo-title">Title</Label>
              <Input
                id="todo-title"
                type="text"
                placeholder="Enter title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-description">Description</Label>
              <Input
                id="todo-description"
                type="text"
                placeholder="Enter description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Todoes;
