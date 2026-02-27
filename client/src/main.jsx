import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Heros from "./components/Heros";
import Home from "./Home";
import Profile from "./components/Profile";
import Dashboard from "./components/Dashboard";
import Session from "./components/Session";
import HomeContent from "./components/HomeContent";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Heros />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/signup",
        element: <SignUp />,
      },
    ],
  },
  {
    path: "/user",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home><HomeContent /></Home>,
      },
      {
        // path: "/user/profile/:userId",
        path: "profile",
        element: <Home><Dashboard /></Home>,
      },
      {
        // path: "/user/profile/:userId/sessions",
        path: "/user/sessions",
        element: <Home><Session /></Home>,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TooltipProvider>
      <div className="dark">
        <RouterProvider router={router} />
      </div>
    </TooltipProvider>
  </StrictMode>,
);
