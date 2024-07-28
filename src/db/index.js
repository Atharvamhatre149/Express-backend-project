import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { json } from "express";

const connectDB= async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        const connectionString=JSON.stringify(connectionInstance.connection.host)
        console.log(`\n MONGODB connected !! DB HOST : ${connectionString}`);
    } catch (error) {
        console.log("MongoDB connection Error: ",error);
        process.exit(1);

    }
}


export default connectDB;