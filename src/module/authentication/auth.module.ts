import { Router } from "express";
import { googleController, loginController, logoutConrtoller, refreshController, registerController } from "./auth.controller";
import { LoginDTO, RegisterDTO } from "./DTO/index.dto";
import { validateDTO } from "../../middleware/validateDTO";

const router: Router = Router()

router.post('/register', validateDTO(RegisterDTO), registerController)
router.post('/login', validateDTO(LoginDTO), loginController)
router.get('/logout', logoutConrtoller)
router.post('/refresh', refreshController)
router.post('/google', googleController)

export default router
