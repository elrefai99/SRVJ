import { Router } from "express";
import { listController, seenController, streamController } from "./notification.controller";
import { userMiddleware } from "../../middleware/user/user.middleware";

const router: Router = Router()

router.get('/stream', userMiddleware, streamController)
router.get('/list', userMiddleware, listController)
router.patch('/seen', userMiddleware, seenController)

export default router
