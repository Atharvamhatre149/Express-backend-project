
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middlewares/multer.middleware.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../db/models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";


const registerUser= asyncHandler(async(req,res)=>{
    // get data from the frontend
    // validations - not empty
    // check if user already exist: username,email
    // check for avatar image
    // upload them to cloudinary
    // create user object and create db entry
    // remove password and refresh token field from response
    // check for user creation
    // return responseor error
    
    
    const {username,fullname,password,email}=req.body;

    console.log(req.body);

    if([username,fullname,password,email].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({
        $or: [{username},{email}]
    })
  
    if(existedUser){
        throw new ApiError(409,"User with username or email already exist")
    }

    console.log("files :",req.files);

    const avatarLocalPath= req.files?.avatar[0]?.path;

    let coverImageLocalPath;

    if(req.files?.coverImage && req.files?.coverImage.length>0){
        coverImageLocalPath=req.files?.coverImage[0]?.path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar=await uploadCloudinary(avatarLocalPath);
    
    const coverImage=await uploadCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Error while uploading the Avatar");
    }

    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,    
        username:username.toLowerCase()

    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})

export default registerUser;