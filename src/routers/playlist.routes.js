import {Router} from "express";
import {addVideoToPlaylist,removeVideoFromPlaylist,createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, updatePlaylist} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router=Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist)
                .get(getUserPlaylists);

router.route("/:playlistId")
        .get(getPlaylistById)
        .patch(updatePlaylist)
        .delete(deletePlaylist)

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

export default router;