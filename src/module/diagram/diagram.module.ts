import { Router } from "express";
import { validateDTO } from "../../middleware/validateDTO";
import { userMiddleware } from "../../middleware/user/user.middleware";
import { getDiagramController, getVersionController, getVersionsController, restoreVersionController, updateDiagramController } from "./diagram.controller";
import { updateDiagramDTO } from "./DTO";

const router: Router = Router()

router.get('/:siteId', userMiddleware, getDiagramController)
router.put('/:projectId', userMiddleware, validateDTO(updateDiagramDTO), updateDiagramController)
router.get('/:projectId/versions', userMiddleware, getVersionsController)
router.get('/:projectId/versions/:versionId', userMiddleware, getVersionController)
router.post('/:projectId/versions/:versionId/restore', userMiddleware, restoreVersionController)

export default router
