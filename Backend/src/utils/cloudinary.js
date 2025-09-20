// Backend/src/utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";
import fs from 'fs';
import { Readable } from 'stream';

dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a local file (screenshot) to Cloudinary.
 */
export async function uploadScreenshot(localPath, opts = {}) {
  const { deleteLocal = true, folder = 'lab_screenshots' } = opts;
  if (!localPath || !fs.existsSync(localPath)) {
    throw new Error('Screenshot file not found: ' + localPath);
  }

  const uploadResult = await cloudinary.uploader.upload(localPath, {
    folder,
    use_filename: true,
    unique_filename: false,
    resource_type: 'image'
  });

  if (deleteLocal) {
    try {
      fs.unlinkSync(localPath);
    } catch (err) {
      console.warn('Failed to delete local screenshot', localPath, err.message || err);
    }
  }

  return {
    url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
    result: uploadResult
  };
}

/**
 * Upload a buffer (like PDF) to Cloudinary.
 */
export async function uploadBufferToCloudinary(buffer, filename, folder = 'reports') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.replace(/[^a-z0-9_\-]/gi, '_'),
        resource_type: 'raw',   // ✅ force raw for PDFs
        overwrite: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
}

export default cloudinary;
