import mongoose,{model,Schema} from "mongoose";

const playlistSchema=new Schema({
    name:{
        type:String,
        required:true,
    },
    description:{
        type:String,
    },
    videos:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    creater:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
},
{
    timestamps:true
})


export const Playlist=model("Playlist",playlistSchema);