import { useState } from "react";
import Todoes from "./HomesContent/Todoes.jsx";
import TodoesList from "./HomesContent/TodoesList.jsx";



const HomeContent = () => {
    const [showTodoInput, setShowTodoInput] = useState(false);
  return (
    <div className=" justify-center items-center">
      {showTodoInput ? <Todoes /> : <TodoesList showTodoInput={showTodoInput} setShowTodoInput={setShowTodoInput} />}
    </div>
  );
};

export default HomeContent;
