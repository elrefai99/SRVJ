import { Router } from "express";
import { listController, publishController, streamController } from "./notification.controller";
import { userMiddleware } from "../../middleware/user/user.middleware";

const router: Router = Router()

router.get('/stream', userMiddleware, streamController)
router.post('/publish', userMiddleware, publishController)
router.get('/list', userMiddleware, listController)
// router.patch('/seen-all',)
// router.patch('/:id/seen',)

export default router
