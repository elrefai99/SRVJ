import { Router } from "express";
import { forgetPasswordController, googleController, loginController, logoutConrtoller, refreshController, registerController, resetPasswordController } from "./auth.controller";
import { GoogleLoginDTO, LoginDTO, RegisterDTO } from "./DTO/index.dto";
import { validateDTO } from "../../middleware/validateDTO";
import { authlimiter } from "../../utils/limit-request";

const router: Router = Router()

router.post('/register', authlimiter, validateDTO(RegisterDTO), registerController)
router.post('/login', authlimiter, validateDTO(LoginDTO), loginController)
router.post('/logout', logoutConrtoller)
router.post('/refresh', authlimiter, refreshController)
router.post('/google', authlimiter, validateDTO(GoogleLoginDTO), googleController)
router.post('/forgot-password', authlimiter, forgetPasswordController)
router.post('/reset-password', authlimiter, resetPasswordController)

export default router
