import { Application } from 'express'

export default (app: Application) => {
     app.use('/api/v1/auth', require("./module/authentication/auth.module").default)
     app.use('/api/v1/user', require("./module/user/user.module").default)
}
