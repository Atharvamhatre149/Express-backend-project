import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View Credentials' below to copy your API secret
    });
    
const uploadCloudinary= async(localFilePath,oldPublicId=null,assetType) => {

    try {

        if(!localFilePath) return null;

        if(oldPublicId){

            let oldFile;

            if(assetType==="video"){
                oldFile = await cloudinary.uploader.destroy(oldPublicId,{
                    resource_type: "video"
                }); 
            }
            else{
                oldFile = await cloudinary.uploader.destroy(oldPublicId); 
            }
        //    console.log(oldFile);
        }
        // upload the file on cloudinary 
        const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        // file uploaded successfully
        console.log("File is uploaded on cloudinary :",response.url);
        fs.unlinkSync(localFilePath);

        return response;
        
        
    } catch (error) {
        // removed the locally saved temporary file as the upload operation got failed
        fs.unlinkSync(localFilePath);
        console.log("error while uploading: ",error);
        
        return null;
    }
 
}


const deleteFromCloudinary= async (oldPublicId)=>{

    try {
        const oldFile = await cloudinary.uploader.destroy(oldPublicId,{
            resource_type: "video"
        }); 
        
    } catch (error) {
        console.log("error while uploading: ",error);
    }

    
}

export {uploadCloudinary,deleteFromCloudinary};
    
    