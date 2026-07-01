import type { IUser } from '../../@types'
import type { DiagramAccess } from '../../module/diagram/service/resolve.access'
import type { ProjectRole } from '../../generated/prisma'
import 'express'

declare global {
     namespace Express {
          export interface Request {
               user?: IUser;
               lang?: string;
               clientIP?: any;
               useragent?: any
               geo?: any;
               diagramAccess?: DiagramAccess;
               projectRole?: ProjectRole;
          }
     }
}

export { }
