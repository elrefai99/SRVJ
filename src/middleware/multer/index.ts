import { Request } from "express";
import multer from "multer";
import { AppError } from "../../utils/errors/app-error";

const multerStorage = multer.memoryStorage();

// Custom file filter function
function fileFilter(_req: Request, file: any, callback: any) {
     if (file.fieldname !== "img") {
          const error = new AppError("Unexpected field. Expected 'img'.", 400);
          return callback(error, false);
     }
     if (!file.mimetype || !file.mimetype.startsWith("image/")) {
          const error = new AppError("Only image uploads are allowed.", 400);
          return callback(error, false);
     }
     callback(null, true);
}

// user upload avatar image and verify image
export const uploadAvatar: any = multer({
     storage: multerStorage,
     fileFilter: fileFilter,
     limits: {
          fileSize: 5 * 1024 * 1024,
          files: 1,
     },
}).single("img")
