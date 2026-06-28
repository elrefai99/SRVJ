import { Request } from "express";
import multer from "multer";
import { AppError } from "../../utils/errors/app-error";

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
