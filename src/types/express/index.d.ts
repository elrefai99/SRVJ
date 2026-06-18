import type { IUser } from '../../@types'
import 'express'

declare global {
     namespace Express {
          export interface Request {
               user?: IUser;
               lang?: string;
               clientIP?: any;
               useragent?: any
               geo?: any;
          }
     }
}

export { }
