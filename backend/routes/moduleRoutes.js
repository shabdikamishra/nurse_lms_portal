import { Router } from "express";
import {
  createModule,
  deleteModule,
  getCourseModules,
  reorderModules,
  updateModule,
} from "../controllers/moduleController.js";

export function buildModuleRoutes({ requireAuth, requireAdmin, moduleContentUpload }) {
  const router = Router();

  router.get("/courses/:courseId/modules", requireAuth(), getCourseModules);
  router.post(
    "/courses/:courseId/modules",
    requireAdmin(),
    moduleContentUpload.single("contentFile"),
    createModule
  );
  router.put(
    "/modules/:id",
    requireAdmin(),
    moduleContentUpload.single("contentFile"),
    updateModule
  );
  router.delete("/modules/:id", requireAdmin(), deleteModule);
  router.post("/courses/:courseId/modules/reorder", requireAdmin(), reorderModules);

  return router;
}
