import { Like } from "../db/models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const toggleVideoLike=asyncHandler(async(req,res)=>{
    
    const {videoId}= req.params;
    const userId=req.user?._id;
    
    try {
        
        const existingLike= await Like.findOne({video:videoId,owner:userId})
        
        if(existingLike){

            await existingLike.deleteOne()
            return res
                .status(200)
                .json(new ApiResponse(200,{},"Liked removed successfully"))
        }
        else{

            const newLike= await Like.create({
                video:videoId,
                owner:userId
            })

            await newLike.save();

            return res
                .status(200)
                .json(new ApiResponse(200,{},"Liked added successfully"))

        }

    } catch (error) {
        
        console.log(error);

        throw new ApiError(500,"Error in toggling like")
    }   


})

const IsVideoLike=asyncHandler(async(req,res)=>{
    
    const {videoId}= req.params;
    const userId=req.user?._id;
    
    try {
        
        const existingLike= await Like.findOne({video:videoId,owner:userId})
        const like = existingLike ? true :false
        return res
            .status(200)
            .json(new ApiResponse(200,{like},"User like retrieved successfully"))

    } catch (error) {
        
        console.log(error);
        throw new ApiError(500,"Error while retrieving like")
    }   
})

const toggleCommentLike=asyncHandler(async(req,res)=>{

    const {commentId} = req.params;
    const userId= req.user?._id;

    try {
        
        const existingLike=await Like.findOne({comment:commentId,owner:userId})

        if(existingLike){

            await existingLike.deleteOne();

            return res
                    .status(200)
                    .json(new ApiResponse(200,{},"Comment like removed successfully"));
        }
        else{

            const newLike= await Like.create({
                comment:commentId,
                owner:userId   
            })

            await newLike.save();

            return res
                    .status(200)
                    .json(new ApiResponse(200,{},"Comment like added successfully"));
        }

    } catch (error) {
        
        console.log(error);

        throw new ApiError(500,"Error in toggling comment like")
        
    }
})

const toggleTweetLike=asyncHandler(async(req,res)=>{

    const {tweetId} = req.params;
    const userId= req.user?._id;

    try {
        
        const existingLike=await Like.findOne({tweet:tweetId,owner:userId})

        if(existingLike){

            await existingLike.deleteOne();

            return res
                    .status(200)
                    .json(new ApiResponse(200,{},"Tweet like removed successfully"));
        }
        else{

            const newLike= await Like.create({
                tweet:tweetId,
                owner:userId   
            })

            await newLike.save();

            return res
                    .status(200)
                    .json(new ApiResponse(200,{},"Tweet like added successfully"));
        }

    } catch (error) {
        
        console.log(error);

        throw new ApiError(500,"Error in toggling Tweet like")
        
    }
})


const getLikedVideos= asyncHandler(async(req,res)=>{
    const userId= req.user?._id;

    const {page=1,limit=10}= req.query;

    try {
        
        const likes= await Like.find({owner:userId, 
            video:
            {
                $exists: true
            }})
            .skip((page-1)*limit)
            .limit(parseInt(limit,10))
            .populate({
                path: 'video',
                populate: {
                    path: 'owner',
                    select: 'username avatar'
                }
            })
            .exec();

            const likedVideos= likes.map(like => like.video)
        
            return res.status(200)
                    .json(new ApiResponse(200,likedVideos,"Liked videos retrieved successfully"))

    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Error fetching liked videos");
    }
})

export {toggleVideoLike,toggleCommentLike,toggleTweetLike,getLikedVideos,IsVideoLike};