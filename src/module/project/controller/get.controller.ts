import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";
import prisma from "../../../config/prisma";

export const getController: RequestHandler = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const projects = await prisma.project.findMany({
      where: {
        ownerId: Number(req.user.id),
      },
      include: {
        diagram: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    res.status(200).json({ code: 200, status: "OK", message: "Success Create new project", data: projects })
  }
)
