import sharp from "sharp";
import cloudinary from "../../config/cloudinary";

function uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
     return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
               {
                    folder: `SRVJ/${folder}`,
                    format: "webp",
                    resource_type: "image",
               },
               (error, result) => {
                    if (error) return reject(error);
                    resolve(result!.secure_url);
               }
          );
          stream.end(buffer);
     });
}

export async function imagesUpload(payload: any, ImagesID: any) {
     if (!payload || !payload["images"]) {
          return { error: "No images uploaded" };
     }

     const uploadTasks = payload["images"].map(async (file: any) => {
          try {
               const url = await imageProcess(file.buffer, ImagesID);
               return { image: url, originalname: file.originalname };
          } catch (error) {
               console.log(`Error uploading image: ${error}`)
               return { error: "Failed to upload image", originalname: file.originalname };
          }
     });

     const results = await Promise.all(uploadTasks);
     return results;
};

export async function avatarProcess(fileBuffer: Buffer, userID: any): Promise<string> {
     const buffer = await sharp(fileBuffer)
          .resize({ width: 450, height: 450 })
          .webp({ quality: 100 })
          .toBuffer();

     return uploadBuffer(buffer, `user/avatars/${userID}`);
};

export async function imageProcess(fileBuffer: Buffer, userID: any): Promise<string> {
     const buffer = await sharp(fileBuffer)
          .withMetadata()
          .webp({ quality: 100 })
          .toBuffer();

     return uploadBuffer(buffer, `/${userID}`);
};
