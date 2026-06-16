import { Router } from "express";
import { validateDTO } from "../../middleware/validateDTO";
import { createController } from "./project.controller";
import { createProjectDTO } from "./DTO";
import { userMiddleware } from "../../middleware/user/user.middleware";
import { getController } from "./controller/get.controller";

const router: Router = Router()

router.post('/create', userMiddleware, validateDTO(createProjectDTO), createController)
router.get('/', userMiddleware, getController)

export default router

