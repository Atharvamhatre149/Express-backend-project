import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { deleteFromCloudinary, uploadCloudinary } from "../utils/cloudinary.js";
import { Video } from "../db/models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Like } from "../db/models/like.model.js";
import { Subscription } from "../db/models/subscription.model.js";
import { Playlist } from "../db/models/playlist.model.js";
import { Comment } from "../db/models/comment.model.js";
import { User } from "../db/models/user.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query='', sortBy='createdAt', sortType='desc', userId, all = 0 } = req.query;
    const match = {
        isPublished: true // By default, only show published videos
    };

    if(query){
        match.$or= [
            {title: {$regex: query, $options: 'i'}},
            {description: {$regex:query, $options: 'i'}}
        ];
    }

    if(userId && mongoose.Types.ObjectId.isValid(userId)){
        match.owner = new mongoose.Types.ObjectId(userId);
    } 
    if (all == 1) {
        delete match.isPublished;
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
        
        const result = await Video.aggregatePaginate(
            Video.aggregate(aggregationPipeline),
            options
        )

        // Add debug information to response
        const debugInfo = {
            matchCondition: match,
            totalVideosForUser: await Video.countDocuments({ owner: match.owner }),
            aggregationPipeline: aggregationPipeline
        };
        
        return res
        .status(200)
        .json(
            new ApiResponse(200, { ...result, debug: debugInfo }, "Videos retrieved successfully")
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

    const video = await Video.findById(videoId).populate('owner', 'username avatar');

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    // Run in parallel — only include playlist logic if user is logged in
    const baseOperations = [
        Like.countDocuments({ video: videoId }),
        Subscription.countDocuments({ channel: video.owner._id })
    ];

    if (req.user?._id) {
        baseOperations.push(
            Playlist.findOneAndUpdate(
                { name: "Watch History", creator: req.user._id },
                {
                    $pull: { videos: videoId },
                    $setOnInsert: { creator: req.user._id }
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true
                }
            )
        );
    }

    const [likeCount, subscriberCount, watchHistoryResult] = await Promise.all(baseOperations);


    if (watchHistoryResult) {
        await Playlist.updateOne(
            { _id: watchHistoryResult._id },
            { $push: { videos: { $each: [videoId], $position: 0 } } }
        );
    }

    const videoWithDetails = {
        ...video._doc,
        likes: likeCount || 0,
        subscriberCount: subscriberCount || 0
    };

    return res.status(200).json(
        new ApiResponse(200, videoWithDetails, "Video is available")
    );
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
    const {videoId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();

        // Delete video from cloudinary
        await deleteFromCloudinary(video.publicId);

        // Delete video document
        await Video.findByIdAndDelete(videoId).session(session);

        // Remove video from all playlists
        await Playlist.updateMany(
            { videos: videoId },
            { $pull: { videos: videoId } },
            { session }
        );

        // Delete all likes associated with the video
        await Like.deleteMany({ video: videoId }).session(session);

        // Delete all comments associated with the video
        await Comment.deleteMany({ video: videoId }).session(session);

        // Remove video from users' watch history
        await User.updateMany(
            { watchHistory: videoId },
            { $pull: { watchHistory: videoId } },
            { session }
        );

        await session.commitTransaction();

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Video and all associated data deleted successfully"
            ));

    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, "Error in deleting the video and associated data");
    } finally {
        session.endSession();
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

const incrementVideoViews = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

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
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { views: video.views }, "Video views incremented successfully")
        );
});

const getSubscribedChannelsVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
       
        const subscribedChannels = await Subscription.find(
            { subscriber: userId },
            { channel: 1, _id: 0 }
        );

        const channelIds = subscribedChannels.map(sub => sub.channel);

        if (!channelIds.length) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    { docs: [], totalDocs: 0, limit, page, totalPages: 0 },
                    "No subscribed channels found"
                )
            );
        }

        const sortOption = {};
        sortOption[sortBy] = sortType === 'asc' ? 1 : -1;

        const aggregationPipeline = [
            {
                $match: {
                    owner: { $in: channelIds },
                    isPublished: true
                }
            },
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
            {
                $sort: sortOption
            }
        ];

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };

        const result = await Video.aggregatePaginate(
            Video.aggregate(aggregationPipeline),
            options
        );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    result,
                    "Subscribed channels' videos fetched successfully"
                )
            );

    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Error occurred while fetching subscribed channels' videos");
    }
});

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    incrementVideoViews,
    getSubscribedChannelsVideos
};
