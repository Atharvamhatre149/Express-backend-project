import {Router} from "express";
import {addVideoToPlaylist,removeVideoFromPlaylist,createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists,getUserPlaylistNames, getPlaylistsContainingVideo, updatePlaylist} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router=Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist)
                .get(getUserPlaylists);

router.route("/names").get(getUserPlaylistNames);
router.route("/v/:videoId").get(getPlaylistsContainingVideo);
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

router.route("/:playlistId")
        .get(getPlaylistById)
        .patch(updatePlaylist)
        .delete(deletePlaylist);

export default router;