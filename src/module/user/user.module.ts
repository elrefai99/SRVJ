import { Router } from "express";
import { profileController, updateProfileController } from "./user.controller";
import { meMiddleware } from "./Middleware/me.middleware";
import { userMiddleware } from "../../middleware/user/user.middleware";
import { uploadAvatar } from "../../middleware/multer";

const router: Router = Router()

router.get('/me', meMiddleware, profileController)
router.put('/update', userMiddleware, uploadAvatar, updateProfileController)

export default router
