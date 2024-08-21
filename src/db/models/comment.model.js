import express,{Schema,model} from "express";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema=new Schema({
    content:{
        type:String,
        required:true,
    },
    video:{
        type:Schema.Types.ObjectId,
        ref:"Video",
        required:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

},
{
    timeStamps:true
});

commentSchema.plugin(mongooseAggregatePaginate);

export const comment=model('Comment',commentSchema);