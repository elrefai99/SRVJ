import { Router } from "express";
import { validateDTO } from "../../middleware/validateDTO";
import { createController, editController, getController } from "./project.controller";
import { createProjectDTO } from "./DTO";
import { userMiddleware } from "../../middleware/user/user.middleware";

const router: Router = Router()

router.post('/create', userMiddleware, validateDTO(createProjectDTO), createController)
router.get('/', userMiddleware, getController)
router.put('/edit/:id', userMiddleware, editController)

export default router

