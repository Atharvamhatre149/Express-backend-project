
import mongoose,{Schema,model} from "mongoose";

const likeSchema=new Schema({
    video:{
        type:Schema.Types.ObjectId,
        ref:"Video",
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    comment:{
        type:Schema.Types.ObjectId,
        ref:"Comment",
    },
    tweet:{
        type:Schema.Types.ObjectId,
        ref:"Tweet",
    },
},
{
    timestamps:ture
})


export const Like=mongoose.model("Like",likeSchema);