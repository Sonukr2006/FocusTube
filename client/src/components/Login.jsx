import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useDispatch, useSelector } from "react-redux";
import {
  selectAuthLoading,
  signInUserThunk,
} from "@/store/slices/authSlice";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthLoading = useSelector(selectAuthLoading);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { id, value } = event.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateLoginForm = () => {
    const normalizedEmail = formData.email.trim();
    const normalizedPassword = formData.password.trim();

    if (!normalizedEmail) {
      const message = "Email field is required.";
      setError(message);
      alert(message);
      return false;
    }

    if (!normalizedPassword) {
      const message = "Password field is required.";
      setError(message);
      alert(message);
      return false;
    }

    return true;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!validateLoginForm()) {
      return;
    }

    try {
      const response = await dispatch(signInUserThunk(formData)).unwrap();
      const user = response?.user;
      alert(response?.message || "Login successful.");
      navigate(user?._id ? `/user/${user._id}` : "/");
    } catch (requestError) {
      const message =
        typeof requestError === "string"
          ? requestError
          : requestError?.message || "Unable to login";
      setError(message);
      alert(message);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
        <CardAction>
          <NavLink
            to="/signup"
            className="text-sm underline-offset-4 hover:underline"
          >
            Sign Up
          </NavLink>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} noValidate>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isAuthLoading}>
              {isAuthLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
