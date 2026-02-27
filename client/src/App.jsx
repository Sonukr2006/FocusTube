import { useState } from "react";
import { Outlet } from "react-router";
import "./App.css";
import Container from "./components/Container";
import Header from "./components/Header";
import Home from "./Home";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Container>
      <div className="w-full mb-4">
        <Header />
      </div>
      <main className="flex flex-1 min-h-0 w-full">
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <Outlet context={{ isLoggedIn, setIsLoggedIn }} />
        </div>
      </main>
    </Container>
  );
}

export default App;
