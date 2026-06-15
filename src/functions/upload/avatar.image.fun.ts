import sharp from 'sharp'
import cloudinary from '../../config/cloudinary'

const colorArray = [
     { 1: '#E7731D' },
     { 2: '#2F7568' },
     { 3: '#4875F7' },
     { 4: '#4E38BE' },
     { 5: '#66B3EB' },
     { 6: '#2788A9' },
     { 7: '#1E78CC' },
     { 8: '#119DBF' },
     { 9: '#557390' },
     { 10: '#3B73C5' },
     { 11: '#D78A3F' },
     { 12: '#E8e8e8' },
]

function getRandomColor(colorArray: any) {
     const randomIndex = Math.floor(Math.random() * colorArray.length)
     const colorObject = colorArray[randomIndex]
     const colorKey = Object.keys(colorObject)[0]
     const colorValue = colorObject[colorKey]
     return colorValue
}

const checkTextOfFullNameArabicOrEnglish = async (input: any) => {
     let isArabic = false
     let isEnglish = false

     for (const char of input) {
          const charCode = char.charCodeAt(0)

          if ((charCode >= 0x0600 && charCode <= 0x06FF) ||
               (charCode >= 0x0750 && charCode <= 0x077F) ||
               (charCode >= 0xFE70 && charCode <= 0xFEFF)) {
               isArabic = true
          }
          else if ((charCode >= 0x0041 && charCode <= 0x005A) ||
               (charCode >= 0x0061 && charCode <= 0x007A)) {
               isEnglish = true
          }

          if (isArabic && isEnglish) {
               return 'Mixed'
          }
     }

     if (isArabic) {
          return 'Arabic'
     } else if (isEnglish) {
          return 'English'
     } else {
          return 'Unknown'
     }
}

function uploadBuffer(buffer: Buffer, publicId: string): Promise<string> {
     return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
               {
                    folder: "doc-station/user/avatars",
                    public_id: publicId,
                    format: "png",
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

export const avatarProfile = async (name: string, id: any) => {
     const width = 450
     const height = 450
     const backgroundColor = getRandomColor(colorArray)

     const avatar = sharp({
          create: {
               width,
               height,
               channels: 4,
               background: backgroundColor
          }
     })

     const checkText = await checkTextOfFullNameArabicOrEnglish(name)
     let init = ''

     if (checkText === 'Arabic') {
          init = name.split(' ').map((part) => part[0].toUpperCase()).join(' ')
     } else if (checkText === 'English') {
          init = name.split(' ').map((part) => part[0].toUpperCase()).join('')
     }

     const imageBuffer = await avatar.composite([{
          input: Buffer.from(`
                         <svg width="${width}" height="${height}">
                           <text x="50%" y="60%" font-size="150" font-family="Arial" text-anchor="middle" fill="#e8e8e8" alignment-baseline="middle">${init}</text>
                         </svg>`), top: 0, left: 0
     }]).png().toBuffer()

     const url = await uploadBuffer(imageBuffer, String(id));
     return url;
}
