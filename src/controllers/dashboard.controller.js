import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../db/models/video.model.js";
import { Subscription } from "../db/models/subscription.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Like } from "../db/models/like.model.js";


const getChannelStats = asyncHandler(async(req,res)=>{
    // Get the channel stats like total video views, total subscribers, total videos, total likes
    
    try {
        const channelId=req.user?._id;
    
        const videoViewsResult=await Video.aggregate([
            {$match:{owner:new mongoose.Types.ObjectId(channelId)}},
            {$group:{_id:null,totalViews:{$sum: '$views'}}}
        ])
        
        const totalViews= videoViewsResult.length>0 ? videoViewsResult[0].totalViews : 0;

        const totalSubscribers= await Subscription.countDocuments({channel:channelId});

        const totalVideos= await Video.countDocuments({owner:channelId});

        const likeResult=await Like.aggregate([
            {$match:{ video:{$exists:true}}},
            {
                $lookup:{
                    from:"videos",
                    localField:"video",
                    foreignField:"_id",
                    as:"videoDetails"
                }
            },
            {$unwind:"$videoDetails"},
            {$match:{"videoDeatils.owner":new mongoose.Types.ObjectId(channelId)}},
            {$count:"totalLikes"}

        ]);
        
        

        const totalLikes = likeResult.length>0 ? likeResult[0].totalLikes : 0;

        const stats={
            totalLikes,
            totalSubscribers,
            totalViews,
            totalVideos
        };

        return res.status(200)
                .json(new ApiResponse(200,stats,"Channel stats retrived successfully"));

    } catch (error) {
        console.log(error);
        throw new ApiError(200,"Error occured while fetching channel stats");
        
        
    }

})


const getChannelVideos= asyncHandler(async(req,res)=>{

    const { page = 1, limit = 10, query='', sortBy='createdAt', sortType='desc' } = req.query;
    const channelId=req.user?._id;
    
    const match={};

    if(query){
        match.$or= [
            {title: {$regex: query, $option: 'i'}},
            {description: {$regex:query, $option: 'i'}}
        ];
    }

    
    match.owner=channelId;
    

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
            new ApiResponse(200,result,"Channel Videos retrieved successfully")
        )

    } catch (error) {
        console.log(error);     
        throw new ApiError(500,"Error occurred while fetching channel videos");
    }
})

export{
    getChannelStats,
    getChannelVideos
}