import { Router } from "express";
import { userMiddleware } from "../../middleware/user/user.middleware";
import { authorizeDiagram } from "./middleware/authorize.diagram";
import { getDiagramController, getVersionController, getVersionsController, restoreVersionController } from "./diagram.controller";

const router: Router = Router()

router.get('/:siteId', userMiddleware, authorizeDiagram("view"), getDiagramController)
router.get('/:projectId/versions', userMiddleware, authorizeDiagram("view"), getVersionsController)
router.get('/:projectId/versions/:versionId', userMiddleware, authorizeDiagram("view"), getVersionController)
router.post('/:projectId/versions/:versionId/restore', userMiddleware, authorizeDiagram("restore"), restoreVersionController)

export default router
