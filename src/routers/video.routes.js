import { Router } from "express";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, publishVideo, togglePublishStatus, updateVideo, incrementVideoViews } from "../controllers/video.controller.js";

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
    .get(optionalVerifyJWT,getVideoById)
    .delete(verifyJWT,deleteVideo)
    .patch(verifyJWT,upload.single("videoFile"),updateVideo)

router
    .route("/toggle/publish/:videoId").patch(verifyJWT,togglePublishStatus)

router.route("/view/:videoId")
        .post(incrementVideoViews)

export default router;