import { Outlet } from "react-router";
import "./App.css";
import Container from "./components/Container";
import Header from "./components/Header";

function App() {
  return (
    <Container>
      <div className="w-full mb-4">
        <Header />
      </div>
      <main className="flex flex-1 min-h-0 w-full">
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <Outlet />
        </div>
      </main>
    </Container>
  );
}

export default App;
