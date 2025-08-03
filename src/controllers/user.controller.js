import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middlewares/multer.middleware.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../db/models/user.model.js";
import { uploadCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { set } from "mongoose";
import { Playlist } from "../db/models/playlist.model.js";

const registerUser = asyncHandler(async (req, res) => {
    // get data from the frontend
    // validations - not empty
    // check if user already exist: username,email
    // check for avatar image
    // upload them to cloudinary
    // create user object and create db entry
    // remove password and refresh token field from response
    // check for user creation
    // return responseor error

    const { username, fullname, password, email } = req.body;
    console.log("request is ",req.files);
    
    if (
        [username, fullname, password, email].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;

    if (req.files?.coverImage && req.files?.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Error while uploading the Avatar");
    }

    const user = await User.create({
        fullname,
        avatar: {
            url: avatar.url,
            public_id: avatar.public_id
        },
        coverImage: coverImage ? {
            url: coverImage.url,
            public_id: coverImage.public_id
        } : undefined,
        email,  
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "something went wrong while registering the user"
        );
    }

    // Create Watch Later playlist for the new user
    await Playlist.create({
        name: "Watch Later",
        creator: user._id,
        videos: []
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered successfully")
        );
});

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating refresh and access token"
        );
    }
};

const loginUser = asyncHandler(async (req, res) => {
    // get data of the user
    // username or email
    // find the user in DB
    // check password
    // generate access and refresh token
    // send cookie

    const { email, username, password } = req.body;

    console.log("request body :", req.body);

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -description -links -coverImage -watchHistory"
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : 'localhost',
        path: '/',
        maxAge: 60 * 60 * 1000,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                },
                "User Logged In Successfully"
            )
        );
});

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : 'localhost',
        path: '/'
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken =
            req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : 'localhost',
            path: '/',
            maxAge: 15 * 60 * 1000,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, {
                ...cookieOptions,
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json(
                new ApiResponse(
                    200,
                    { accessToken, newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordRight = user.isPasswordCorrect(oldPassword);

    if (!isPasswordRight) {
        throw new ApiError(400, "Invalid old Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Updated Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        );
});

const updateUserAvater = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Get current user to delete old avatar from cloudinary
    const user = await User.findById(req.user?._id);

    const avatar = await uploadCloudinary(avatarLocalPath,user.avatar.public_id);

    if (!avatar) {
        throw new ApiError(
            400,
            "Error while uploading updated avatar on cloudinary"
        );
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    url: avatar.url,
                    public_id: avatar.public_id
                }
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "User Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    // Get current user to delete old cover image from cloudinary
    const user = await User.findById(req.user?._id);

    const coverImage = await uploadCloudinary(coverImageLocalPath,user.coverImage.public_id);

    if (!coverImage.url) {
        throw new ApiError(
            400,
            "Error while uploading updated cover image on cloudinary"
        );
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: {
                    url: coverImage.url,
                    public_id: coverImage.public_id
                }
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "User cover image updated successfully")
        );
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const { description, links } = req.body;

    if (!description && !links) {
        throw new ApiError(400, "At least one field (description or links) is required");
    }

    // Validate links format if provided
    if (links) {
        if (!Array.isArray(links)) {
            throw new ApiError(400, "Links must be an array");
        }

        // Validate each link object
        links.forEach((link, index) => {
            if (!link.title?.trim() || !link.url?.trim()) {
                throw new ApiError(400, `Invalid link at index ${index}. Both title and url are required`);
            }
            
            // Basic URL validation
            try {
                new URL(link.url);
            } catch (error) {
                throw new ApiError(400, `Invalid URL for link "${link.title}"`);
            }
        });
    }

    const updateFields = {};
    
    if (description !== undefined) {
        updateFields.description = description.trim();
    }
    
    if (links !== undefined) {
        updateFields.links = links.map(link => ({
            title: link.title.trim(),
            url: link.url.trim()
        }));
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: updateFields
        },
        {
            new: true,
            runValidators: true
        }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "User profile updated successfully"
            )
        );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trime()) {
        throw new ApiError(400, "Username is misssing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "SubscribeTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {

    const user=await User.aggregate([
        {
            $match:{
                // To check
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"User history fetched successfully"))

});

const getUserInfoById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1,
                description: 1,
                links: 1
            }
        }
    ]);

    if (!user?.length) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0],
                "User information fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvater,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    getUserInfoById,
    updateUserProfile
};
