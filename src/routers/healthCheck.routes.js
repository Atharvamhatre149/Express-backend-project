import {Router} from "express";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import healthcheck from "../controllers/healthcheck.controller.js";

const router=Router();

router.route("/").get(healthcheck);

export default router;