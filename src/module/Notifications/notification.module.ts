import { Router } from "express";
import { listController, publishController, seenController, streamController } from "./notification.controller";
import { userMiddleware } from "../../middleware/user/user.middleware";
import { validateDTO } from "../../middleware/validateDTO";
import { publishNotificationDTO } from "./DTO";

const router: Router = Router()

router.get('/stream', userMiddleware, streamController)
router.get('/list', userMiddleware, listController)
router.patch('/seen', userMiddleware, seenController)
router.post('/publish', userMiddleware, validateDTO(publishNotificationDTO), publishController)

export default router
