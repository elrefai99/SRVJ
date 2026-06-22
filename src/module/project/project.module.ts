import { Router } from "express";
import { validateDTO } from "../../middleware/validateDTO";
import { acceptInvitesController, createController, deleteController, editController, getController, getInvitesController, invitesController } from "./project.controller";
import { createProjectDTO } from "./DTO";
import { userMiddleware } from "../../middleware/user/user.middleware";

const router: Router = Router()

router.post('/create', userMiddleware, validateDTO(createProjectDTO), createController)
router.get('/', userMiddleware, getController)
router.put('/edit/:id', userMiddleware, editController)
router.delete('/delete/:id', userMiddleware, deleteController)
router.post('/invite', userMiddleware, invitesController)
router.patch('/invite/accept/:id', userMiddleware, acceptInvitesController)
router.get('/invite/get', getInvitesController)

export default router

