// upload file on cloudinary

import { v2 as cloudinary } from "cloudinary";
import fs from "fs" //manage file system
    
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY , 
  api_secret:  process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
    try{
        if(!localFilePath)return null
        //upload the file on cloudinary
     const response = await   cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        console.log("file url",response.url)
        console.log("file uploaded on cloudinary!!");
        return response
    }catch(error){
        fs.unlinkSync(localFilePath) //delete file from local server as upload operation got failed
        return null
    }
} 


return {uploadOnCloudinary}