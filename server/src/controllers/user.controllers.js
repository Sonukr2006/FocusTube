import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 15 * 60 * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

const sanitizeUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
});

const getSignUpErrorResponse = (error) => {
  if (error?.code === 11000 && error?.keyPattern?.email) {
    return {
      statusCode: 409,
      message: "User already exists with this email",
    };
  }

  if (error?.name === "ValidationError") {
    const firstMessage =
      Object.values(error.errors || {})[0]?.message || "Invalid signup data";

    return {
      statusCode: 400,
      message: firstMessage,
    };
  }

  return {
    statusCode: 500,
    message: "Failed to create account",
  };
};

const issueAuthTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const getRefreshTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.refreshToken;
  if (cookieToken) return cookieToken;

  const bodyToken = req.body?.refreshToken;
  if (bodyToken) return bodyToken;

  return "";
};

const clearAuthCookies = (res) =>
  res
    .clearCookie("accessToken", CLEAR_COOKIE_OPTIONS)
    .clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);

export const signUpUser = async (req, res) => {
  try {
    const { fullName, email, password, phone = "" } = req.body;

    const normalizedName = fullName?.trim();
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedPhone = phone?.trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      fullName: normalizedName,
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
    });

    const { accessToken, refreshToken } = await issueAuthTokens(user);

    return res
      .status(201)
      .cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
      .json({
        success: true,
        message: "Account created successfully",
        data: {
          user: sanitizeUser(user),
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    console.error("Signup error:", error);
    const { statusCode, message } = getSignUpErrorResponse(error);

    return res.status(statusCode).json({
      success: false,
      message,
      error: error.message,
    });
  }
};

export const signInUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
      .json({
        success: true,
        message: "Signed in successfully",
        data: {
          user: sanitizeUser(user),
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sign in",
      error: error.message,
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken = getRefreshTokenFromRequest(req);

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: refresh token missing",
      });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch (error) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: invalid or expired refresh token",
      });
    }

    const user = await User.findById(decodedToken?.userid);
    if (!user || !user.refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: refresh token not recognized",
      });
    }

    if (user.refreshToken !== incomingRefreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: refresh token mismatch",
      });
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS)
      .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS)
      .json({
        success: true,
        message: "Session refreshed successfully",
        data: {
          user: sanitizeUser(user),
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to refresh session",
      error: error.message,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const incomingRefreshToken = getRefreshTokenFromRequest(req);
    if (incomingRefreshToken) {
      const decodedToken = jwt.verify(incomingRefreshToken);
      if (decodedToken?.userid) {
        await User.findByIdAndUpdate(decodedToken.userid, {
          $set: { refreshToken: "" },
        });
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user?.userid;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (!loggedInUserId || String(loggedInUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you can only access your own profile",
      });
    }

    const user = await User.findById(userId).select(
      "_id fullName email phone createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
};
