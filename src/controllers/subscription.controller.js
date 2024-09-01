import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../db/models/subscription.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
ApiResponse

const toggleSubscription = asyncHandler(async(req,res)=>{
    const {channelId} = req.params;
    const userId=req.user?._id;

    try {
        
        const existingSubscribe= await Subscription.findOne({subscriber:userId,channel:channelId});

        if(existingSubscribe){

            await existingSubscribe.deleteOne()

            return res
                .status(200)
                .json(new ApiResponse(200,{},"Subscription removed successfully"))
        }
        else{

            const newSubscribe= await Subscription.create({
                subscriber:userId,channel:channelId
            })

            await newSubscribe.save();

            return res
                .status(200)
                .json(new ApiResponse(200,newSubscribe,"Subscription added successfully"))

        }

    } catch (error) {
        
        console.log(error);

        throw new ApiError(500,"Error in toggling subscription");
    }   

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const {channelId} = req.params;

    const channelSubscribers=await Subscription.find({channel:channelId})

    if(!channelSubscribers){
        throw new ApiError(500,"Error while fetching channel Subscribers");
    }

    return res
        .status(200)
        .json(new ApiResponse(200,channelSubscribers,"Channel subscribers fetched successfully"));

});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async(req,res)=>{
    const {subscriberId} = req.params;

    const channelSubscribed=await Subscription.find({subscriber:subscriberId})

    if(!channelSubscribed){
        throw new ApiError(500,"Error while fetching channels which are Subscribed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200,channelSubscribed,"Subscribed channels fetched successfully"));

});


export {toggleSubscription,getSubscribedChannels,getUserChannelSubscribers};