
import mongoose from "mongoose";
import { Comment } from "../db/models/comment.model.js";
import { Like } from "../db/models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";


const getVideoComments=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    const {page=1,limit=10}=req.query;

    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    };

    try {
        const aggregationPipeline=[
            {
                $match:{
                    video: new mongoose.Types.ObjectId(videoId)
                },
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
                $lookup: {
                    from: "likes",
                    let: { commentId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$comment", "$$commentId"] },
                                        { $eq: ["$owner", req.user?._id] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "userLike"
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likes"
                }
            },
            {
                $addFields: {
                    owner: { $first: "$owner" },
                    likeCount: { $size: "$likes" },
                    isLiked: {
                        $cond: {
                            if: { $gt: [{ $size: "$userLike" }, 0] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    likes: 0,
                    userLike: 0
                }
            },
            {
                $sort: { createdAt: -1 }  
            },
            {
                $skip: (options.page-1)*options.limit
            },
            {
                $limit: options.limit
            }
        ];

        const result=await Comment.aggregatePaginate(
            Comment.aggregate(aggregationPipeline),
            options
        )

        return res
        .status(200)
        .json(
            new ApiResponse(200,result,"comments retrieved successfully")
        )

    } catch (error) {
        console.log(error);     
        throw new ApiError(500,"Error occurred while fetching comments");
    }
})

const addComment=asyncHandler(async(req,res)=>{

    try {
        const {videoId}=req.params;
        const {content}=req.body;    

        const comment=await Comment.create({
            content:content,
            video:videoId,
            owner:req.user?._id
        })

        if(!comment){
            throw new ApiError(500,"Error in posting comment");
        }

        const populatedComment = await Comment.findById(comment._id).populate('owner', 'username avatar');
        
        return res
        .status(201)
        .json(
            new ApiResponse(200,populatedComment,"Comment is posted successfully")
        )

    } catch (error) {
        console.log(error);     
        throw new ApiError(500,"Error occurred while posting comment");
    }
})

const updateComment=asyncHandler(async(req,res)=>{
    try {
        const {commentId} = req.params;
        const {content}=req.body;
        
        if(!content?.trim()){
            throw new ApiError(400, "Content is required");
        }

        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: content
                },
            },
            { new: true }
        ).populate('owner', 'username avatar');

        if(!updatedComment){
            throw new ApiError(404, "Comment not found");
        }

        return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment is updated successfully"));

    } catch (error) {
        throw new ApiError(error?.statusCode || 500, error?.message || "Error occurred while updating the comment")
    }
})

const deleteComment=asyncHandler(async(req,res)=>{
    
    try {
        const {commentId}=req.params;

        await Comment.findByIdAndDelete(commentId);

        return res
                .status(200)
                .json(new ApiResponse(200,{},"Comment deleted successfully"))
        
    } catch (error) {
        throw new ApiError(500,"Error in deleting the comment")
    } 
})

export {getVideoComments,addComment,updateComment,deleteComment};