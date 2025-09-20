import jwt from "jsonwebtoken"
import User from "../models/User.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const protectRoute = asyncHandler(async (req,res,next) => {
    // try {
        const token = req.cookies?.jwt  || req.header("Authorization")?.replace("Bearer ","")

        if(!token){
            throw new ApiError(401,"Unauthorised- token not found")
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY);

        if(!decoded){
            throw new ApiError(401,"Unauthorised- Invalid token")
        }

        const user = await User.findById(decoded?.userId).select("-password");

        if(!user){
            throw new ApiError(401,"Unauthorised- User not found");
        }

        req.user = user;

        next()

    // } catch (error) {
    //     console.log("Error in protectRoute middleware",error);
    //     throw new ApiError(500,"Internal server Error");     
    // }
})