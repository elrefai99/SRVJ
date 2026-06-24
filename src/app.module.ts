import { Application } from 'express'
import authModule from './module/authentication/auth.module'
import userModule from './module/user/user.module'
import projectModule from './module/project/project.module'
import notificationModule from './module/Notifications/notification.module'
import emailsModule from './module/emails/emails.module'
import diagramModule from './module/diagram/diagram.module'

export default (app: Application) => {
     app.use('/api/v1/auth', authModule)
     app.use('/api/v1/user', userModule)
     app.use('/api/v1/project', projectModule)
     app.use('/api/v1/notification', notificationModule)
     app.use('/api/v1/emails', emailsModule)
     app.use('/api/v1/diagram', diagramModule)
}
