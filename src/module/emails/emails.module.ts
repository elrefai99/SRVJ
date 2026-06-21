import { Router } from "express";
import { clickController, openedController } from "./emails.controller";

const router: Router = Router()

router.get('/opened', openedController)
router.get('/click', clickController)

export default router
