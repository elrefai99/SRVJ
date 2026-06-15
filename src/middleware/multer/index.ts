import { Request } from "express";
import multer from "multer";
import path from "node:path";
import { AppError } from "../../utils/errors/app-error";

function destination(req: Request, _file: any, callback: any) {
     const { baseUrl } = req;
     const isUser = baseUrl === "/api/v1/user";

     const folderPath = path.join(__dirname, "../../../cdn",
          isUser ?
               "user"
               :
               ""
     );

     callback(null, folderPath);
}


function filename(_req: Request, file: any, callback: any) {
     callback(
          null,
          parseInt(
               Math.ceil(Math.random() * Date.now())
                    .toPrecision(16)
                    .toString()
                    .replace(".", "")
          ) + path.extname(file.originalname)
     );
}

const multerStorage = multer.diskStorage({
     destination: destination,
     filename: filename,
});

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
