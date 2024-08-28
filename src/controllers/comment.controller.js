
import mongoose from "mongoose";
import { Comment } from "../db/models/comment.model.js";
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
        
        return res
        .status(201)
        .json(
            new ApiResponse(200,comment,"Comment is posted successfully")
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
        

        const newComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content:content
                },
            },
            { new: true }
        );

        return res
        .status(200)
        .json(new ApiResponse(200, newComment, "Comment is updated successfully"));

    } catch (error) {
        throw new ApiError(400,"Error occurred while updating the comment")
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