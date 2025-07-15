import mongoose from "mongoose";
import { Playlist } from "../db/models/playlist.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Video } from "../db/models/video.model.js";

const createPlaylist= asyncHandler(async(req,res)=>{

    const {name}= req.body;

    if(!name){
        throw new ApiError(400,"Name is required");
    }

    const playlist=await Playlist.create({
        name,
        creater: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500,"Error while creating a playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200,playlist,"Playlist created successfully")
        )

})

const getUserPlaylists= asyncHandler(async(req,res)=>{


    console.log("request reached");
    
    const playlists= await Playlist.find(
        {
            creater:req.user?._id
        }
    ).populate('videos');


    if(!playlists){
        throw new ApiError(500,"Error while getting user playlists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200,playlists,"Playlists fetched successfully")
        )

})

const getPlaylistById= asyncHandler(async(req,res)=>{

    const {playlistId}= req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID format");
    }

    const playlist=await Playlist.findById(playlistId).populate('videos');

    if(!playlist){
        throw new ApiError(500,"Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200,playlist,"Playlist fetched successfully")
        )

})


const addVideoToPlaylist= asyncHandler(async(req,res)=>{

    const {playlistId,videoId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid playlistId or VideoId")
    }

    const playlist=await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist not found");
    }

    const video=await Video.findById(videoId);

    if(!video){
        throw new ApiError(404,"video not found");
    }

    if(await playlist.videos.includes(videoId)){
        throw new ApiError(400,"Video already exists in the playlist");
    }

    await playlist.videos.push(videoId);

    await playlist.save();

    return res
            .status(200)
            .json(new ApiResponse(200,playlist,"Video added to playlist successfully"))

})

const removeVideoFromPlaylist = asyncHandler(async(req,res)=>{

    const {playlistId,videoId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid playlistId or VideoId")
    }

    const playlist=await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist not found");
    }

    const videoIndex=playlist.videos.indexOf(videoId);

    if(videoIndex=== -1){
        throw new ApiError(400,"Video not exists in the playlist");
    }

    playlist.videos.splice(videoIndex,1);

    await playlist.save();

    return res
            .status(200)
            .json(new ApiResponse(200,playlist,"Video removed from playlist successfully"))


})

const deletePlaylist = asyncHandler(async(req,res)=>{

    const {playlistId}= req.params;

    
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400,"Invalid playlist Id")
    }

    try {
    
        await Playlist.findByIdAndDelete(playlistId);

        return res
        .status(200)
        .json(new ApiResponse(200,{},"Playlist deleted successfully"))
    
    } catch (error) {
        console.log(error);
        
        throw new ApiError(500,"Error occur while deleting a playlist")
        
    }


})

const updatePlaylist = asyncHandler(async(req,res)=>{
    const {playlistId} = req.params;
    const {name} = req.body;

    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400,"Invalid playlist Id")
    }

    const playlist= await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(404,"Playlist not found")
    }

    try {
        
        if(name){
            playlist.name=name;
        }
    
        await playlist.save();

        return res
        .status(200)
        .json(new ApiResponse(200,playlist,"Playlist updated successfully"))

    } catch (error) {
        console.log(error);
        throw new ApiError(500,"Error occur while updating the playlist");
    }
})

const getPlaylistsContainingVideo = asyncHandler(async(req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const playlists = await Playlist.find({
        creater: req.user?._id,
        videos: videoId
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlists, "Playlists containing video fetched successfully")
        );
});

export{createPlaylist,getPlaylistById,getUserPlaylists,addVideoToPlaylist,removeVideoFromPlaylist,deletePlaylist,updatePlaylist,getPlaylistsContainingVideo};