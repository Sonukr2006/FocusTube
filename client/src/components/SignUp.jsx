import { useState } from "react";
import { NavLink, useNavigate, useOutletContext } from "react-router";
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
import { signUp } from "@/lib/auth";

export default function SignUp() {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useOutletContext() ?? {};
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { id, value } = event.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateSignUpForm = () => {
    const normalizedName = formData.fullName.trim();
    const normalizedEmail = formData.email.trim();
    const normalizedPassword = formData.password.trim();

    if (!normalizedName) {
      const message = "Name field is required.";
      setError(message);
      alert(message);
      return false;
    }

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validateSignUpForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await signUp(formData);
      const user = response?.data?.user;
      const accessToken = response?.data?.accessToken;

      if (user) {
        localStorage.setItem("focustube_user", JSON.stringify(user));
      }
      if (accessToken) {
        localStorage.setItem("focustube_access_token", accessToken);
      }

      alert(response?.message || "Account created successfully.");
      setIsLoggedIn?.(true);
      navigate(user?._id ? `/user/${user._id}` : "/");
    } catch (requestError) {
      const message = requestError.message || "Unable to create account";
      setError(message);
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign Up for an account</CardTitle>
        <CardDescription>
          Enter your email below to create an account
        </CardDescription>
        <CardAction>
          <NavLink
            to="/login"
            className="text-sm underline-offset-4 hover:underline"
          >
            Sign in
          </NavLink>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>
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
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="text"
                placeholder="+1 555 000 1234"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
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
