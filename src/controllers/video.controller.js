import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { deleteFromCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { Video } from "../db/models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../db/models/user.model.js";
import { log } from "console";
import { Like } from "../db/models/like.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query='', sortBy='createdAt', sortType='desc', userId } = req.query;

    const match={};

    if(query){
        match.$or= [
            {title: {$regex: query, $option: 'i'}},
            {description: {$regex:query, $option: 'i'}}
        ];
    }

    if(userId){
        match.owner=userId;
    }

    const sortOption = {};

    sortOption[sortBy] = sortType === 'asc' ? 1 : -1;

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10),
        sort:sortOption
    };
    
    try {

        const aggregationPipeline=[
            {$match: match},
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$owner"
            },
            {$sort:sortOption},
            {
                $skip: (options.page-1)*options.limit
            },
            {$limit: options.limit}
        ];
        
        const result= await Video.aggregatePaginate(
            Video.aggregate(aggregationPipeline),
            options
        )

        return res
        .status(200)
        .json(
            new ApiResponse(200,result,"Videos retrieved successfully")
        )

    } catch (error) {
        console.log(error);     
        throw new ApiError(500,"Error occurred while fetching videos");
    }

});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if([title,description].some(
        (field) => field?.trim() ===""
    )
    ){
        throw new ApiError(400,"All fields are required");
    }

    console.log("title is :",title);
    
    const videoFilePath=req.files?.videoFile[0]?.path;

    if (!videoFilePath) {
        throw new ApiError(400, "Video file is required");
    }

    const thumbnailPath=req.files?.thumbnail[0]?.path;

    if(!thumbnailPath){
        throw new ApiError(400,"Thumbnail is required");
    }

    const videoFile=await uploadCloudinary(videoFilePath);

    if (!videoFile) {
        throw new ApiError(400, "Error while uploading the Video file");
    }

    const thumbnail=await uploadCloudinary(thumbnailPath);

    if (!thumbnail) {
        throw new ApiError(400, "Error while uploading the thumbnail");
    }
    
    console.log("video: ",videoFile);
    
    
    const video=await Video.create({
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        title,
        description,
        duration:videoFile.duration,
        owner:req.user?._id,
        publicId:videoFile.public_id
    })

    if(!video){
        throw new ApiError(500,"Error in publishing the video");
    }
    
    return res
    .status(201)
    .json(
        new ApiResponse(200,video,"Video is published successfully")
    )

});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // First increment the views
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: { views: 1 }
        },
        {
            new: true
        }
    ).populate('owner', 'username avatar');

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    const likeCount = await Like.countDocuments({ video: videoId });

    const videoWithLikes = {
        ...video._doc,
        likes: likeCount
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, videoWithLikes, "video is available")
        )
});

const updateVideo = asyncHandler(async (req, res) => {

    const {videoId}= req.params;

    const video=await Video.findById(videoId);

    if(!video){
        return new ApiError(400,"Video id is incorrect");
    }

    const videoLocalPath=req.file?.path;

    if(!videoLocalPath){
        return new ApiError(400,"Video file is missing");
    }

    const videoFile=await uploadCloudinary(videoLocalPath,video?.publicId,"video");

    if (!videoFile.url) {
        throw new ApiError(
            400,
            "Error while uploading updated video on cloudinary"
        );
    }

    const newVideo = await Video.findByIdAndUpdate(
        video?._id,
        {
            $set: {
                videoFile: videoFile?.url,
                publicId:  videoFile?.public_id
            },
        },
        { new: true }
    );

    console.log(newVideo);
    

    return res
        .status(200)
        .json(new ApiResponse(200, newVideo, "Video file updated successfully"));

});

const deleteVideo = asyncHandler(async (req, res) => {
    
    try {
        const {videoId}=req.params;

        const video=await Video.findById(videoId);
        
        if(!video){
            return new ApiError(400,"Video id is incorrect");
        }

        await deleteFromCloudinary(video?.publicId);

        await Video.findByIdAndDelete(videoId);

        return res
               .status(200)
               .json(new ApiResponse(200,{},"Video deleted successfully"));

    } catch (error) {
        throw new ApiError(500,"Error in deleting the video")
    }

});

const togglePublishStatus = asyncHandler(async (req, res) => {
    
    try {
        const {videoId}=req.params;

        const video=await Video.findById(videoId);

        if(!video){
            return new ApiError(400,"Video Id is incorrect");
        }

        const newVideo = await Video.findByIdAndUpdate(
            video?._id,
            {
                $set: {
                    isPublished:!video?.isPublished
                },
            },
            { new: true }
        );
    
        return res
            .status(200)
            .json(new ApiResponse(200, newVideo, "publish Status updated successfully"));



    } catch (error) {
        throw new ApiError(500,"Error in changing the publish Status")
    }
});

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
