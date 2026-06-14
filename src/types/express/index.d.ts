import type { IUserRequest } from '../../@types'
import 'express'

declare global {
     namespace Express {
          export interface Request {
               user?: any;
               lang?: string;
               clientIP?: any;
               useragent?: any
               geo?: any;
          }
     }
}

export { }
