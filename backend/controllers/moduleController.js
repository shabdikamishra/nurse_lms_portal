import { Course, Module } from "../schemas/models.js";
import { canManageCourse } from "../services/courseAccessService.js";

async function assertCourseEditable(req, res, courseId) {
  const { ok, course } = await canManageCourse(req.user, courseId);
  if (!ok || !course) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }
  if (
    req.user.role === "supervisor" &&
    !["DRAFT", "REJECTED"].includes(course.status)
  ) {
    res.status(403).json({
      message: "Course cannot be edited while pending approval or published",
    });
    return null;
  }
  return course;
}

function parseModulePayload(body = {}) {
  const payload = {
    title: typeof body.title === "string" ? body.title.trim() : "",
    targetRole: typeof body.targetRole === "string" ? body.targetRole.trim() : "",
    estimatedDuration:
      typeof body.estimatedDuration === "string" ? body.estimatedDuration.trim() : "",
    learningObjectives:
      typeof body.learningObjectives === "string" ? body.learningObjectives.trim() : "",
    mode: typeof body.mode === "string" ? body.mode.trim() : "",
    language: typeof body.language === "string" ? body.language.trim() : "",
    certification: typeof body.certification === "string" ? body.certification.trim() : "",
  };

  if (body.passingPercentage !== undefined && body.passingPercentage !== "") {
    const pct = Number(body.passingPercentage);
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      payload.passingPercentage = pct;
    }
  }

  if (body.maxQuizAttempts !== undefined) {
    if (body.maxQuizAttempts === null || body.maxQuizAttempts === "") {
      payload.maxQuizAttempts = null;
    } else {
      const attempts = Number(body.maxQuizAttempts);
      if (Number.isFinite(attempts) && attempts >= 1) {
        payload.maxQuizAttempts = attempts;
      }
    }
  }

  return payload;
}

export async function getCourseModules(req, res) {
  try {
    const modules = await Module.find({ courseId: req.params.courseId })
      .sort({ order: 1 })
      .lean()
      .exec();
    res.json(modules);
  } catch (err) {
    console.error("Error fetching modules", err);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
}

export async function createModule(req, res) {
  try {
    const payload = parseModulePayload(req.body);
    if (!payload.title) {
      return res.status(400).json({ message: "Module title is required" });
    }

    const course = await assertCourseEditable(req, res, req.params.courseId);
    if (!course) return;

    const last = await Module.findOne({ courseId: req.params.courseId })
      .sort({ order: -1 })
      .lean()
      .exec();
    const nextOrder = last ? (last.order ?? 0) + 1 : 1;

    const contentFile = req.file
      ? {
          filename: req.file.originalname,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer,
        }
      : undefined;

    const created = await Module.create({
      courseId: req.params.courseId,
      order: nextOrder,
      ...payload,
      ...(contentFile ? { contentFile } : {}),
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating module", err);
    res.status(500).json({ message: "Failed to create module" });
  }
}

export async function updateModule(req, res) {
  try {
    const existing = await Module.findById(req.params.id).lean().exec();
    if (!existing) {
      return res.status(404).json({ message: "Module not found" });
    }
    const course = await assertCourseEditable(req, res, String(existing.courseId));
    if (!course) return;

    const payload = parseModulePayload(req.body);
    const update = {};

    if (typeof req.body.title === "string") {
      if (!payload.title) {
        return res.status(400).json({ message: "title cannot be empty" });
      }
      update.title = payload.title;
    }

    for (const key of [
      "targetRole",
      "estimatedDuration",
      "learningObjectives",
      "mode",
      "language",
      "certification",
      "passingPercentage",
      "maxQuizAttempts",
    ]) {
      if (typeof req.body[key] === "string" || typeof req.body[key] === "number") {
        if (key === "passingPercentage" || key === "maxQuizAttempts") {
          if (payload[key] !== undefined) update[key] = payload[key];
        } else if (typeof req.body[key] === "string") {
          update[key] = payload[key];
        }
      }
    }

    if (req.body.maxQuizAttempts === null || req.body.maxQuizAttempts === "") {
      update.maxQuizAttempts = null;
    }

    if (req.file) {
      update.contentFile = {
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer,
      };
    }

    const updated = await Module.findByIdAndUpdate(req.params.id, update, {
      new: true,
    })
      .lean()
      .exec();
    if (!updated) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating module", err);
    res.status(500).json({ message: "Failed to update module" });
  }
}

export async function deleteModule(req, res) {
  try {
    const existing = await Module.findById(req.params.id).lean().exec();
    if (!existing) {
      return res.status(404).json({ message: "Module not found" });
    }
    const course = await assertCourseEditable(req, res, String(existing.courseId));
    if (!course) return;

    const deleted = await Module.findByIdAndDelete(req.params.id).lean().exec();
    if (!deleted) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.json({ message: "Module deleted" });
  } catch (err) {
    console.error("Error deleting module", err);
    res.status(500).json({ message: "Failed to delete module" });
  }
}

export async function reorderModules(req, res) {
  try {
    const { orderedModuleIds } = req.body || {};
    if (!Array.isArray(orderedModuleIds) || orderedModuleIds.length === 0) {
      return res
        .status(400)
        .json({ message: "orderedModuleIds array is required" });
    }

    const courseId = req.params.courseId;
    const course = await assertCourseEditable(req, res, courseId);
    if (!course) return;
    const modules = await Module.find({ courseId }).lean().exec();
    const moduleIdSet = new Set(modules.map((m) => String(m._id)));
    for (const id of orderedModuleIds) {
      if (!moduleIdSet.has(String(id))) {
        return res.status(400).json({
          message: "orderedModuleIds must contain only modules in this course",
        });
      }
    }
    if (orderedModuleIds.length !== modules.length) {
      return res.status(400).json({
        message: "orderedModuleIds must include all modules for this course",
      });
    }

    const bulk = orderedModuleIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, courseId },
        update: { $set: { order: idx + 1 } },
      },
    }));
    await Module.bulkWrite(bulk);
    res.json({ message: "Reordered successfully" });
  } catch (err) {
    console.error("Error reordering modules", err);
    res.status(500).json({ message: "Failed to reorder modules" });
  }
}
