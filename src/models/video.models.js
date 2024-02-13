import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema= new Schema(
    {
     videoFile:{
        type: String, //cloudnary url
        required: true
     },
     thumbnail:{
        type: String, //cloudnary url
        required: true
     },
     title:{
        type: String, 
        required: true
     },
     description:{
        type: String, 
        required: true
     },
     duration:{
        type: Number, //cloudnary provide the time of video,
        required:true,
     },
     views:{
        type:Number,
        default:0
     },
     isPublished:{
        type: Boolean, //cloudnary url
        default: true
     },
     owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
     }
    },
    {timesstamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",videoSchema)