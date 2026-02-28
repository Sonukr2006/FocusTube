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
import Dashboard from "./components/Dashboard";
import Session from "./components/Session";
import HomeContent from "./components/HomeContent";
import Blocker from "./components/Blocker/Blocker";
import { Provider } from "react-redux";
import { store } from "./store";
import SoftMurmure from "./components/SoftMurmure/SoftMurmure";
import BotPanel from "./components/bot/BotPanel";

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
    path: "/user/:userId",
    element: <App />,
    children: [
      {
        element: <Home />,
        children: [
          {
            index: true,
            element: <HomeContent />,
          },
          {
            path: "profile",
            element: <Dashboard />,
          },
          {
            path: "sessions",
            element: <Session />,
          },
          {
            path: "blocker",
            element: <Blocker />,
          },
          {
            path: "soft-murmure",
            element: <SoftMurmure />,
          },
          {
            path: "bot",
            element: <BotPanel />,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <TooltipProvider>
        <div className="dark">
          <RouterProvider router={router} />
        </div>
      </TooltipProvider>
    </Provider>
  </StrictMode>,
);
