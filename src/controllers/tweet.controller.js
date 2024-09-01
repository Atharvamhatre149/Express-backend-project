import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Tweet } from './../db/models/tweet.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import mongoose from 'mongoose';

const createTweet = asyncHandler(async(req,res)=>{

    const {content}= req.body;

    console.log("tweet ",req.body);
    

    if(!content){
        throw new ApiError(400,"Content is required")
    }

    const tweet= await Tweet.create({
        content,
        owner: req.user?._id
    })

    if(!tweet){
        throw new ApiError(500,"Error while creating the tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200,tweet,"Tweet created successfully"))

});

const getUserTweets = asyncHandler(async(req,res)=>{

    const {userId}= req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format");
    }


    const tweets= await Tweet.find(
        {
            owner: userId
        }
    );

    if(!tweets){
        throw new ApiError(500,"Error occured while fetching the tweets");
    }

    return res.status(200)
            .json(new ApiResponse(200,tweets,"Tweets fetched successfully"))
})

const updateTweet = asyncHandler(async(req,res)=>{

    const {tweetId}=req.params;

    const {content}=req.body;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format");
    }

    const tweet=await Tweet.findByIdAndUpdate(
        tweetId,
        {
            content
        },
        {
            new:true
        }
    );
    
    if(!tweet){
        throw new ApiError(500,"Error while updating the tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200,tweet,"Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async(req,res)=>{

    const {tweetId}=req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format");
    }

    try {
        await Tweet.findByIdAndDelete(tweetId);
    
        return res
            .status(200)
            .json(new ApiResponse(200,{},"Tweet deleted successfully"))
    } catch (error) {
        console.log(error);        
        throw new ApiError(500,"Error while deleting a tweet");
    }

})

export {createTweet,getUserTweets,updateTweet,deleteTweet};

