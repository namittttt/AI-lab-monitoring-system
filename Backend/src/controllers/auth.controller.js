import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken"

// ✅ Helper: Generate JWT
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

// ✅ Signup
export const signup = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName)
    throw new ApiError(400, "All fields are required");

  if (password.length < 6)
    throw new ApiError(400, "Password must be at least 6 characters");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new ApiError(400, "Invalid email format");

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(400, "Email already registered");

  const newUser = await User.create({ email, password, fullName });
  const token = generateToken(newUser._id);

  res.cookie("jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(201).json(
    new ApiResponse(201, {
      user: { _id: newUser._id, fullName, email },
    }, "Signup successful")
  );
});

// ✅ Login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "All fields required");

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password)))
    throw new ApiError(401, "Invalid email or password");

  const token = generateToken(user._id);

  res.cookie("jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(
    new ApiResponse(200, {
      user: { _id: user._id, fullName: user.fullName, email: user.email },
    }, "Login successful")
  );
});

// ✅ Logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("jwt");
  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});
