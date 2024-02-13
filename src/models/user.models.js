import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
const userSchema = new Schema(
    {
     username:{
        type:String,
        required:true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true //optimize searching in database
     },
     email:{
        type:String,
        required:true,
        unique: true,
        lowercase: true,
        trim: true,
     },
     fullname:{
        type:String,
        required:true,
        unique: true,
        trim: true,
        index:true,
     },
     avatar:{
        type:String, //cloudnary url
        required: true,
     },
     coverImage:{
        type:String 
     },
     watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
     ],
     password:{
        type: String,
        required:[true,'Password is required']
     },
     refreshToken:{
        type:String
     }
    },
    {timesstamps:true})

userSchema.pre("save",async function (next) { //encypt ppassword before saving data
    if(!this.isModified("password"))return next();
    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){  //validate password
  return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign({
        _id: this.id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    }, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}
userSchema.methods.refreshAccessToken = function(){
    return jwt.sign({
        _id: this.id,
    }, process.env.REFRESH_TOKEN_SECRET,{
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

export const User = mongoose.model("User",userSchema)