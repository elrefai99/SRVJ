import { Router } from "express";
import { googleController, loginController, logoutConrtoller, refreshController, registerController } from "./auth.controller";
import { LoginDTO, RegisterDTO } from "./DTO/index.dto";
import { validateDTO } from "../../middleware/validateDTO";
import { authlimiter } from "../../utils/limit-request";

const router: Router = Router()

router.post('/register', authlimiter, validateDTO(RegisterDTO), registerController)
router.post('/login', authlimiter, validateDTO(LoginDTO), loginController)
router.post('/logout', logoutConrtoller)
router.post('/refresh', authlimiter, refreshController)
router.post('/google', authlimiter, googleController)

export default router
