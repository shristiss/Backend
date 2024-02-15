import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.refreshAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //steps
  //step1  get user details from frontend (through postman for now)

  const { fullname, email, username, password } = req.body;

  //step2 validation of details -not empty and other

  //    if(fullname===""){
  //     throw new ApiError(400,"FullName is required")
  //    }

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //step3 check if user already exists via email/username

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists!");
  }
  //step4 check for images, check for avatar

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!");
  }

  //step5 upload on cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required!");
  }

  //create user object (to send to mongodb) || create entry in db

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    email,
    username: username.toLowerCase(),
  });

  //remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!!"));
});

const loginUser = asyncHandler(async (req, res) => {
  //take data from req body
  const { email, username, password } = req.body;
  console.log(password);
  // username or email
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required!");
  }
  // find the user
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  // password check

  const isPasswprdValid = await user.isPasswordCorrect(password);

  if (!isPasswprdValid) {
    throw new ApiError(404, "Invalid credentials");
  }

  // access and refresh token

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // send cookie

  const loggenInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true, //modified only by server now
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggenInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true, //modified only by server now
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged out!!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is not available");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used!!");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed!!"
        )
      );
  } catch (error) {
    throw new ApiError(404, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Successfully Changed!!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(200, req.user, "Current user fetched");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Invalid information");
  }
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select(" -passwprd ");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Account Details Updated Successfully !!")
    );
});

const updateAvatarDetails = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is missing!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error while uploading the avatr on cloudinary!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, user, "Avatar updated!!"));
});

const updateCoverImageDetails = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is missing!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(
      400,
      "Error while uploading the cover image on cloudinary!"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated!!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "User not found");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelSubscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscriberCount: 1,
        channelSubscribedTo: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel fetched successfully!!")
    );
});

const getWatchedHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup:{
        from : "videos",
        localField: "watchHistory",
        foreignField : "_id",
        as :"watchHistory",
        pipeline: [
          {
            $lookup:{
              from :" users",
              localField : "owner",
              foreignField : "_id",
              as : "owner",
              pipeline:[
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar :1
                  }
                }
              ]
            }
          },{
            $addFields :{
              owner:{
                $first : "$owner"
              }
            }
          }
        ]
      }
    },
  ]);

  return res.status(200)
  .json(new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfuly "))
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAccountDetails,
  updateAvatarDetails,
  updateCoverImageDetails,
  getUserChannelProfile,
  getCurrentUser,
  changeCurrentPassword,
  getWatchedHistory
};
