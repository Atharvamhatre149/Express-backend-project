import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, publishVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router=Router();

// router.use(verifyJWT)

router.route("/").get(getAllVideos);

router.route("/publish-video").post(verifyJWT,
    upload.fields([
        {
            name:'videoFile',
            maxCount:1
        },
        {
            name:'thumbnail',
            maxCount:1  
        }
    ]),
    publishVideo
);


router
    .route("/:videoId")
    .get(getVideoById)
    .delete(verifyJWT,deleteVideo)
    .patch(verifyJWT,upload.single("videoFile"),updateVideo)

router
    .route("/toggle/publish/:videoId").patch(verifyJWT,togglePublishStatus)

export default router;