import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const protectRoute = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.jwt || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) throw new ApiError(401, "Unauthorized - token not found");

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.userId).select("-password");
  if (!user) throw new ApiError(401, "Unauthorized - user not found");

  req.user = user;
  next();
});


// import jwt from "jsonwebtoken";
// import User from "../models/User.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js"; // ✅ Fix: added missing import

// export const protectRoute = asyncHandler(async (req, res, next) => {
//   // ✅ Get token from cookies or Authorization header
//   const token =
//     req.cookies?.jwt || req.header("Authorization")?.replace("Bearer ", "");

//   if (!token) {
//     throw new ApiError(401, "Unauthorized - token not found");
//   }

//   // ✅ Verify token using secret key
//   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

//   if (!decoded) {
//     throw new ApiError(401, "Unauthorized - Invalid token");
//   }

//   // ✅ Find user by ID and exclude password
//   const user = await User.findById(decoded?.userId).select("-password");

//   if (!user) {
//     throw new ApiError(401, "Unauthorized - User not found");
//   }

//   // ✅ Attach user object to request for further routes
//   req.user = user;

//   // ✅ Move to the next middleware or controller
//   next();
// });


