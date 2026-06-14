import prisma from "../../../config/prisma";
import { RegisterDTO } from "../DTO/index.dto";
import bcrypt from "bcryptjs"

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
                    id: true
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
                    password: newPassword
               },
               select: {
                    id: true
               }
          })
          return { success: true, error: false, message: "Success create new account", data: { id: new_account.id } }
     }
}
