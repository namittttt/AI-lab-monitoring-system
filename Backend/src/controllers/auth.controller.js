import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken"

export const  signup = asyncHandler( async(req,res)=>{
    const {email,password,fullName}= req.body

        if(
            [email,password,fullName].some((field)=>field?.trim() === "")
        ){
            throw new ApiError(400,"All fields are required");
        }

        if(password.length < 6){
            throw new ApiError(400,"Password must be at leat 6 characters");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({email});
        if(existingUser){
            throw new ApiError(400,"User with email already exists, Please use a different one")
        }

        const newUser = await User.create({
            email,
            fullName,
            password,
        })

        
        const token = jwt.sign({userId:newUser._id},process.env.JWT_SECRET_KEY,{
            expiresIn:"7d"
        });

        res.cookie("jwt",token,{
            maxAge:7 * 24 * 60 * 60 * 1000,
            httpOnly:true, //prevent XSS attacks
            sameSite: "strict",//prevent CSRF attacks
            secure:process.env.NODE_ENV === "production",
            // secure: false
        })

        return res.status(201).json(
        new ApiResponse(200,newUser,"User Registered Successfully")
        )

})


export const login = asyncHandler(async (req,res) => {
    const { email,password} = req.body;

    if(
        !email || !password
        // [email,password].some((field)=>field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required");
    }

    const user = await User.findOne({email});
    if(!user){
        throw new ApiError(401,"Invalid Email or Password")
    }

    const isPasswordCorrect =await user.matchPassword(password)

    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid email or password");
    }

    const token = jwt.sign({userId:user._id},process.env.JWT_SECRET_KEY,{
            expiresIn:"7d"
        });

        res.cookie("jwt",token,{
            maxAge:7 * 24 * 60 * 60 * 1000,
            httpOnly:true, //prevent XSS attacks
            sameSite: "strict",//prevent CSRF attacks
            secure:process.env.NODE_ENV === "production",
        });

        return res
        .status(200)
        .json(
            new ApiResponse(200,user,"User Logged in successfully")
        )
})

export const logout = asyncHandler(async (req,res) => {
    res.clearCookie("jwt")
    res
    .status(200)
    .json(
        new ApiResponse(200,"Loged Out Successfully")
    )
})
