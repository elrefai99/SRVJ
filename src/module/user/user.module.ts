import { Router } from "express";
import { profileController } from "./user.controller";
import { meMiddleware } from "./Middleware/me.middleware";

const router: Router = Router()

router.get('/me', meMiddleware, profileController)

export default router
