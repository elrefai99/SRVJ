import prisma from "../../../config/prisma";
import { LoginDTO, RegisterDTO } from "../DTO/index.dto";
import bcrypt from "bcryptjs"
import { V4 } from "paseto";
import { AppError } from "../../../utils/errors/app-error";
import { token_PASETO } from "../utils/paseto.utils";
import { avatarProfile } from "../../../functions/upload/avatar.image.fun";
import { loadPubliceKey } from "../../../utils/loadKey";

export class BaseAuth {
     private API_KEY_SALT: number
     constructor() {
          this.API_KEY_SALT = Number(process.env.API_KEY_SALT)
     }

     private async check_user(payload: { email: string }): Promise<any> {
          const user = await prisma.user.findFirst({
               where: {
                    email: payload.email.toLowerCase()
               },
               select: {
                    id: true,
               }
          })
          if (!user) {
               return { status: false, data: null }
          }
          return { status: true, data: { id: user.id } }
     }
     public async create_user(payload: RegisterDTO): Promise<any> {
          const user = await this.check_user({ email: payload.email })

          if (user.status) {
               return { success: false, error: true, message: "this user account already exist", data: null }
          }
          const salt = await bcrypt.genSalt(this.API_KEY_SALT)
          const newPassword = await bcrypt.hash(payload.password, salt)

          const new_account = await prisma.user.create({
               data: {
                    fullname: payload.fullname,
                    username: `${payload.fullname}_${Math.floor(Math.random() * 10001)}`,
                    email: payload.email.toLowerCase(),
                    password: newPassword,
               },
               select: {
                    id: true
               }
          })
          const avatar = await avatarProfile(payload.fullname, new_account.id)
          await prisma.user.update({
               where: {
                    id: new_account.id
               },
               data: {
                    avatar
               }
          })
          return { success: true, error: false, message: "Success create new account", data: { id: new_account.id } }
     }

     public async login_service(payload: LoginDTO): Promise<any> {
          const user = await prisma.user.findFirst({
               where: {
                    email: payload.email.toLowerCase()
               },
               select: {
                    id: true,
                    password: true,
                    fullname: true
               }
          })

          if (!user) {
               return { success: false, error: true, message: "this user account already exist", data: null }
          }
          const check_password = await bcrypt.compare(payload.password, user.password)
          if (!check_password) {
               return { success: false, error: true, message: "this user account already exist", data: null }
          }

          return { success: true, error: false, message: "Success fetch user account, success login", data: user }
     }
     public async refresh_service(payload: { token: string }): Promise<any> {
          const publicKey = loadPubliceKey("REFRESH_PUBLIC_KEY")
          await V4.verify(payload.token, publicKey).then(async (payload: any) => {
               const user = await prisma.user.findFirst({
                    where: {
                         id: payload.data.user_id,
                    },
                    select: {
                         id: true,
                    }
               })
               if (!user) {
                    throw AppError.notFound("User not found")
               }

               // calculate remaining time for the refresh token
               const expireDate: Date = new Date(payload.exp)
               const remainingMs: number = expireDate.getTime() - Date.now()
               const remainingDays: number = Math.floor(remainingMs / (1000 * 60 * 60 * 24))

               const token: string = await token_PASETO({ data: { user_id: user.id } }, "access")
               const tokenRefresh: string = await token_PASETO({ data: { user_id: user.id } }, "refresh", `${remainingDays}d`)
               return { success: true, token, tokenRefresh, remainingMs }
          }).catch((err) => {
               throw AppError.unauthorized(`Invalid refresh token: ${err}`)
          })
     }
}
