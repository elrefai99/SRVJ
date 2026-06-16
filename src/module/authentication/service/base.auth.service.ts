import prisma from "../../../config/prisma";
import { LoginDTO, RegisterDTO } from "../DTO/index.dto";
import bcrypt from "bcryptjs"
import { avatarProfile } from "../../../functions/upload/avatar.image.fun";
import { OAuth2Client } from "google-auth-library";

export class BaseAuth {
     private API_KEY_SALT: number
     private GOOGLE_CLIENT: OAuth2Client
     constructor() {
          this.API_KEY_SALT = Number(process.env.API_KEY_SALT)
          this, this.GOOGLE_CLIENT = new OAuth2Client(process.env.GOOGLE_CLIENT_ID as string);
     }

     private async check_user(payload: { email: string }): Promise<any> {
          console.log(payload);

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

     private async google_data(payload: any) {
          const ticket = await this.GOOGLE_CLIENT.verifyIdToken({
               idToken: payload,
               audience: process.env.GOOGLE_CLIENT_ID,
          });

          const data = ticket.getPayload();
          return data
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

     public async googleService(payload: any): Promise<any> {
          const token = await this.google_data(payload)
          if (!token) {
               return { success: false, error: true, message: "this token already exist", data: null }
          }

          const user = await prisma.user.findFirst({
               where: {
                    email: token.email?.toLowerCase(),
                    googleId: token.sub
               },
               select: {
                    id: true,
                    fullname: true,
                    email: true
               }
          })
          console.log(user);


          if (user) {
               return { success: true, error: false, message: "Success create new account", data: { id: user?.id, email: user?.email, fullname: user?.fullname } }
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
          return { success: true, error: false, message: "Success create new account", data: { id: new_account.id, email: token.email, fullname } }
     }
}
