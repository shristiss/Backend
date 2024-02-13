import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler( async (req, res) => {
    
   //steps 
   //step1  get user details from frontend (through postman for now)
    
   const {fullname,email,username,password} = req.body 
   

   //step2 validation of details -not empty and other

//    if(fullname===""){
//     throw new ApiError(400,"FullName is required")
//    }

  if([fullname,email,username,password].some((field)=>field?.trim()==="")){
    throw new ApiError(400,"All fields are required")
  }

   //step3 check if user already exists via email/username

   const existedUser = await User.findOne({
    $or: [{ email },{ username }]
   })
  if(existedUser){
    throw new ApiError(409,"User already exists!")
  }
   //step4 check for images, check for avatar

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath= req.files?.coverImage?.[0]?.path;

   
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required!")
    }

   //step5 upload on cloudinary

 const avatar = await uploadOnCloudinary(avatarLocalPath)
 const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  
if(!avatar){
    throw new ApiError(400,"Avatar is required!")
}

//create user object (to send to mongodb) || create entry in db

const user = await User.create({
    fullname,
    avatar: avatar.url ,
    coverImage: coverImage?.url || "",
    password,
    email,
    username: username.toLowerCase()
})

//remove password and refresh token field from response
   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

//check for user creation
   if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user!")
   }


//return response 
return res.status(201).json(
    new ApiResponse(200,createdUser, "User Registered Successfully!!")
)

})

export {registerUser}