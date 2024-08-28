
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const healthcheck=asyncHandler(async(req,res) =>{
    return res
            .status(200)
            .json(new ApiResponse(200,{},"Server is working fine"));
});


export default healthcheck;