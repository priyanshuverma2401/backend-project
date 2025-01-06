import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/users.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";



const generateAccessAndRefreshToken = async(userId) => {
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});
    return {accessToken, refreshToken};
  }catch(error){
    throw newApiError(500, "Token generation failed")
  }
}


const registerUser = asyncHandler(async (req, res) => {
  //get user details from user
  //validation - not empty
  //check if already exists: username, email
  //check for image, check for avatar
  //upload image to cloudinary, avatar, get url
  //create user object -- create entry in db
  //remove password and response token field from response
  //check for user creation
  //send response

  const {fullname, email, username, password} = req.body
  console.log("emal:", email)
  if (fullname == "" || email == "" || username == "" || password == "") {
    throw new ApiError(400, "full name is required")
  }
  const existeduser = await User.findOne({
    $or:[
      { username }, { email }
    ]
  })
  if (existeduser){
    throw new ApiError(409, "User already exists")
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath){
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverLocalPath);

  if (!avatar){
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullname,
    avatar : avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  })

  const createdUser = await User.findById(user._id).select("-password -refreshTokens");

  if (!createdUser){
    throw new ApiError(500, "User creation failed");
  }

  return res.status(201).json(new ApiResponse(201, createdUser, "user created successfully"))
}) 





const loginUser = asyncHandler(async (req, res) =>{
  //req body -> data
  //username, email, password
  //find the user
  //password match
  //access and refresh token
  //send cookies
  //send response

  const {username, email, password} = req.body;
  if (!username && !email){
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [
      {username},
      {email}
    ]
  })

  if (!user){
    throw new ApiError(404, "User not found")
  }

const ispasswordValid = await user.isPasswordCorrect(password);
if (!ispasswordValid){
  throw new ApiError(401, "Password is incorrect")
}

const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

const loggedInUser = await findById(user._id).select("-password -refreshTokens");
const options = {
  httpOnly: true,
  secure: true
}
return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
  new ApiResponse(
    200,
    {
      user: loggedInUser,
      accessToken,
      refreshToken
    },
    "User logged in successfully"
  )
)

})


export {registerUser}