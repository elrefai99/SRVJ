import path from "path";
import fs from "fs-extra";
import { readFile } from "fs/promises";
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
               const url = await imageProcess(file.filename, ImagesID);
               return { image: url, path: file.path };
          } catch (error) {
               console.log(`Error uploading image: ${error}`)
               return { error: "Failed to upload image", path: file.path };
          }
     });

     const results = await Promise.all(uploadTasks);
     return results;
};

export async function avatarProcess(imgName: any, userID: any): Promise<string> {
     const buffer = await sharp(
          await readFile(path.join(__dirname, '../../../', `cdn/user/${imgName}`))
     ).resize({ width: 450, height: 450 })
          .webp({ quality: 100 })
          .toBuffer();

     const url = await uploadBuffer(buffer, `user/avatars/${userID}`);

     fs.unlink(path.join(__dirname, '../../../', `cdn/user/${imgName}`), (err) => {
          if (err) console.log(err);
     });

     return url;
};

export async function imageProcess(imgName: any, userID: any): Promise<string> {
     const buffer = await sharp(
          await readFile(path.join(__dirname, '../../../', `cdn/user/${imgName}`))
     ).withMetadata()
          .webp({ quality: 100 })
          .toBuffer();

     const url = await uploadBuffer(buffer, `/${userID}`);

     fs.unlink(
          path.join(__dirname, '../../../', `cdn/user/${imgName}`),
          (err) => {
               if (err) console.log(err);
          }
     );

     return url;
};
