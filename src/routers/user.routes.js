import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logOutUser,
    refreshAccessToken,
    registerUser,
    updateUserAvater,
    updateUserCoverImage,
    getUserInfoById,
    updateUserProfile
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logOutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("current-user").get(verifyJWT, getCurrentUser);

// router.route("/update-aaaccount").patch(verifyJWT,updateAccountDetails); TOdo

router
    .route("/avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvater);

router
    .route("/cover-image")
    .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/update-profile").patch(verifyJWT, updateUserProfile);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

router.route("/watch-history").get(verifyJWT, getWatchHistory);

router.route("/:userId").get(verifyJWT, getUserInfoById);

export default router;
