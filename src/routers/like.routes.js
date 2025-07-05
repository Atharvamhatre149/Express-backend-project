import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike, IsVideoLike} from "../controllers/like.controller.js";

const router=Router();

router.use(verifyJWT);  


router.route("/toggle/v/:videoId").post(toggleVideoLike)
router.route("/toggle/c/:commentId").post(toggleCommentLike)
router.route("/toggle/t/:tweetId").post(toggleTweetLike)
router.route("/videos").get(getLikedVideos)
router.route("/v/:videoId").get(IsVideoLike)

export default router;