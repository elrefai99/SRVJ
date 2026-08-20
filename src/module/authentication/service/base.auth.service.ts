import prisma from "../../../config/prisma";
import { LoginDTO, RegisterDTO } from "../DTO/index.dto";
import bcrypt from "bcryptjs"
import { avatarProfile } from "../../../functions/upload/avatar.image.fun";
import { OAuth2Client } from "google-auth-library";
import { tableStatus } from "../../../generated/prisma";
import { BaseUser } from "../../user/Service/base.user.service";

export class BaseAuth {
     private API_KEY_SALT: number
     private GOOGLE_CLIENT: OAuth2Client
     private baseUser: BaseUser
     constructor() {
          this.API_KEY_SALT = Number(process.env.API_KEY_SALT)
          this, this.GOOGLE_CLIENT = new OAuth2Client(process.env.GOOGLE_CLIENT_ID as string);
          this.baseUser = new BaseUser()
     }

     private async google_data(payload: any) {
          const ticket = await this.GOOGLE_CLIENT.verifyIdToken({
               idToken: payload,
               audience: process.env.GOOGLE_CLIENT_ID,
          });

          const data = ticket.getPayload();
          return data
     }

     public async create_user(payload: RegisterDTO): Promise<any> {
          const user = await this.baseUser.user_profile_email({ email: payload.email })

          if (user.data.status) {
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
                    id: new_account.id,
                    status: tableStatus.active
               },
               data: {
                    avatar
               }
          })
          return { success: true, error: false, message: "Success create new account", data: { id: new_account.id } }
     }

     public async login_service(payload: LoginDTO): Promise<any> {
          const user = await this.baseUser.user_profile_email({ email: payload.email })

          if (!user.data) {
               return { success: false, error: true, message: "Invalid email or password", data: null }
          }
          const check_password = await bcrypt.compare(payload.password, user.data.password)
          if (!check_password) {
               return { success: false, error: true, message: "Invalid email or password", data: null }
          }

          return { success: true, error: false, message: "Success fetch user account, success login", data: user.data }
     }

     public async forgetPasswordService(payload: string): Promise<any> {
          const user = await this.baseUser.user_profile_email({ email: payload })

          if (!user.data) {
               return { error: true, message: "user not founded" }
          }
          return user

     }

     public async googleService(payload: any): Promise<any> {
          const token = await this.google_data(payload)
          if (!token || !token.email || !token.email_verified || !token.sub) {
               return { success: false, error: true, message: "Invalid Google credential", data: null }
          }

          const email = token.email.toLowerCase()
          const user = await this.baseUser.user_profile_email({ email: email })

          if (user.data) {
               if (!user.data.googleId) {
                    await prisma.user.update({
                         where: { id: user.data.id },
                         data: { googleId: token.sub }
                    })
               }
               return { success: true, error: false, message: "Success create new account", data: { id: user.data.id, email: user.data.email, fullname: user.data.fullname, login: true } }
          }

          const fullname: string = `${token.given_name} ${token.family_name}`
          const username: string = `${fullname}_${Math.floor(Math.random() * 10001)}`
          const salt = await bcrypt.genSalt(this.API_KEY_SALT)
          const newPassword = await bcrypt.hash(`${fullname} ${username} ${Math.floor(Math.random() * 10001)}`, salt)
          const new_account = await prisma.user.create({
               data: {
                    fullname,
                    username,
                    email: String(token?.email?.toLowerCase()),
                    password: newPassword,
                    googleId: token.sub,
                    avatar: token.picture
               },
               select: {
                    id: true
               }
          })
          return { success: true, error: false, message: "Success create new account", data: { id: new_account.id, email: token.email, fullname, register: true } }
     }
}
