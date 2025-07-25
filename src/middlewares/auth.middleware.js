import { User } from "../db/models/user.model.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT= asyncHandler(async(req,res,next)=>{

    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","");

        if(!token){
            throw new ApiError(401,"Unauthorized request");
        }
    
        const decodedTokenInfo= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user= await User.findById(decodedTokenInfo?._id).select("-password -refreshToken");
    
        if(!user) throw new ApiError(401,"Invalid Access Token");
    
        req.user=user;

        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Access Token");
    }

})


export const optionalVerifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "").trim();

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded?._id).select("-password -refreshToken");

        if (user) {
            req.user = user;
        }
    } catch (err) {
        throw new ApiError(401,error?.message || "Invalid Access Token");
    }

    next();
});
