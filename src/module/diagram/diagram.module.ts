import { Router } from "express";
import { validateDTO } from "../../middleware/validateDTO";
import { userMiddleware } from "../../middleware/user/user.middleware";
import { authorizeDiagram } from "../../middleware/rbac/authorize.diagram";
import { getDiagramController, getVersionController, getVersionsController, restoreVersionController, updateDiagramController } from "./diagram.controller";
import { updateDiagramDTO } from "./DTO";

const router: Router = Router()

router.get('/:siteId', userMiddleware, authorizeDiagram("view"), getDiagramController)
router.put('/:projectId', userMiddleware, authorizeDiagram("edit"), validateDTO(updateDiagramDTO), updateDiagramController)
router.get('/:projectId/versions', userMiddleware, authorizeDiagram("view"), getVersionsController)
router.get('/:projectId/versions/:versionId', userMiddleware, authorizeDiagram("view"), getVersionController)
router.post('/:projectId/versions/:versionId/restore', userMiddleware, authorizeDiagram("restore"), restoreVersionController)

export default router
