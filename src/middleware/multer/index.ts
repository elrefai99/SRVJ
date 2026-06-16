import { Request } from "express";
import multer from "multer";
import { AppError } from "../../utils/errors/app-error";

// Keep uploads in memory and stream them straight to Cloudinary.
// The deployed host (Render) has an ephemeral filesystem and no writable
// `cdn/` folder, so writing to disk first fails with ENOENT.
const multerStorage = multer.memoryStorage();

// Custom file filter function
function fileFilter(_req: Request, file: any, callback: any) {
     if (file.fieldname !== "img") {
          const error = new AppError("Unexpected field. Expected 'img'.", 404);
          return callback(error, false);
     }
     callback(null, true);
}

// user upload avatar image and verify image
export const uploadAvatar: any = multer({
     storage: multerStorage,
     fileFilter: fileFilter,
     limits: {
          fileSize: 75 * 1024 * 1024,
     },
}).single("img")

export const medical_historyImage: any = multer({
     storage: multerStorage,
     limits: {
          fileSize: 75 * 1024 * 1024,
     },
}).fields([
     {
          name: 'images',
     },
])

export const uploadMultiImage: any = multer({
     storage: multerStorage,
     limits: {
          fileSize: 75 * 1024 * 1024,
     },
}).fields([
     {
          name: 'mainImage',
     },
     {
          name: 'multiImage',
     },
])
