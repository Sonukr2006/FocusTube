import { Outlet } from "react-router";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import Container from "./components/Container";
import Header from "./components/Header";
import { restoreSessionThunk, selectAuthRestoring } from "@/store/slices/authSlice";

function App() {
  const dispatch = useDispatch();
  const isRestoring = useSelector(selectAuthRestoring);

  useEffect(() => {
    dispatch(restoreSessionThunk());
  }, [dispatch]);

  if (isRestoring) {
    return (
      <Container>
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Restoring session...</p>
        </div>
      </Container>
    );
  }

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
