import fs from 'fs';
import path from 'path';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    const uploadDir = './public/temp';
    const originalName = file.originalname;

    const ext = path.extname(originalName);         // ".jpg"
    const name = path.basename(originalName, ext);  // "IMG_1004"

    const fullPath = path.join(uploadDir, originalName);

    let finalName = originalName;

    // If file already exists ONCE → add _1
    if (fs.existsSync(fullPath)) {
      finalName = `${name}_1${ext}`;
    }

    cb(null, finalName);
  }
});

export const upload = multer({ storage });
