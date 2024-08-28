import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app=express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true,
}));

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static('public'));
app.use(cookieParser()); 


// import Routes 
import userRouter from './routers/user.routes.js';
import videoRouter from './routers/video.routes.js'
import healthcheckRouter from "./routers/healthCheck.routes.js";
import commentRouter from "./routers/comment.routes.js"
import likeRouter from "./routers/like.routes.js"

// Routes declaration 
app.use("/api/v1/users",userRouter)
app.use("/api/v1/videos",videoRouter)
app.use("/api/v1/comments",commentRouter)
app.use("/api/v1",healthcheckRouter)
app.use("/api/v1/likes",likeRouter)

// https://localhost:8000/api/v1/users


export default app;