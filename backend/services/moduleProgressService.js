import {
  Module,
  Lesson,
  SOP,
  Progress,
  Course,
  QuizAttempt,
} from "../schemas/models.js";

export function isCoursePublished(course) {
  if (!course) return false;
  return course.status === "PUBLISHED";
}

export async function getCourseModulesOrdered(courseId) {
  return Module.find({ courseId }).sort({ order: 1 }).lean().exec();
}

export async function getProgressMap(userId, moduleIds) {
  if (!moduleIds.length) return new Map();
  const docs = await Progress.find({
    userId,
    moduleId: { $in: moduleIds },
  })
    .lean()
    .exec();
  return new Map(docs.map((p) => [String(p.moduleId), p]));
}

export async function getContentCountsByModule(moduleIds) {
  const counts = new Map();
  for (const id of moduleIds) {
    counts.set(String(id), {
      lessonCount: 0,
      sopCount: 0,
      hasContent: false,
    });
  }
  if (!moduleIds.length) return counts;

  const [lessons, sops, modules] = await Promise.all([
    Lesson.find({ moduleId: { $in: moduleIds } })
      .select({ moduleId: 1 })
      .lean()
      .exec(),
    SOP.find({ moduleId: { $in: moduleIds } })
      .select({ moduleId: 1 })
      .lean()
      .exec(),
    Module.find({ _id: { $in: moduleIds } })
      .select({ _id: 1, contentFile: 1 })
      .lean()
      .exec(),
  ]);

  for (const lesson of lessons) {
    const key = String(lesson.moduleId);
    const entry = counts.get(key);
    if (entry) entry.lessonCount += 1;
  }
  for (const sop of sops) {
    const key = String(sop.moduleId);
    const entry = counts.get(key);
    if (entry) entry.sopCount += 1;
  }
  for (const mod of modules) {
    const key = String(mod._id);
    const entry = counts.get(key);
    if (entry) {
      entry.hasContent = !!(mod.contentFile?.data && mod.contentFile?.filename);
    }
  }
  return counts;
}

export function isContentFullyViewed(progress, counts) {
  const viewedLessons = new Set(
    (progress?.lessonsViewed || []).map((id) => String(id))
  );
  const viewedSops = new Set((progress?.sopsViewed || []).map((id) => String(id)));
  const totalLessons = counts?.lessonCount || 0;
  const totalSops = counts?.sopCount || 0;
  const needsContent = !!counts?.hasContent;

  if (totalLessons > 0 && viewedLessons.size < totalLessons) return false;
  if (totalSops > 0 && viewedSops.size < totalSops) return false;
  if (needsContent && !progress?.contentViewed) return false;
  return true;
}

export function computeProgressPercent(progress, counts) {
  let total = 0;
  let done = 0;

  const lessonCount = counts?.lessonCount || 0;
  const sopCount = counts?.sopCount || 0;
  const hasContent = !!counts?.hasContent;
  const hasQuiz = true;

  total += lessonCount + sopCount + (hasContent ? 1 : 0) + 1;

  done += (progress?.lessonsViewed || []).length;
  done += (progress?.sopsViewed || []).length;
  if (hasContent && progress?.contentViewed) done += 1;
  if (progress?.quizPassed) done += 1;

  if (total === 0) return progress?.quizPassed ? 100 : 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function isModuleCompleted(progress, counts) {
  return (
    !!progress?.quizPassed &&
    isContentFullyViewed(progress, counts) &&
    progress?.status === "COMPLETED"
  );
}

export function isPreviousModuleCompleted(module, allModules, progressMap) {
  const idx = allModules.findIndex((m) => String(m._id) === String(module._id));
  if (idx <= 0) return true;
  const prev = allModules[idx - 1];
  const prevProgress = progressMap.get(String(prev._id));
  return prevProgress?.status === "COMPLETED";
}

export function deriveDisplayStatus(progress, isUnlocked) {
  if (!isUnlocked) return "LOCKED";
  if (progress?.status === "COMPLETED") return "COMPLETED";
  if (progress?.status === "IN_PROGRESS") return "IN_PROGRESS";
  return "NOT_STARTED";
}

export async function getOrCreateProgress(userId, moduleId, courseId) {
  let doc = await Progress.findOne({ userId, moduleId }).exec();
  if (!doc) {
    doc = await Progress.create({
      userId,
      moduleId,
      courseId,
      status: "NOT_STARTED",
    });
  } else if (courseId && !doc.courseId) {
    doc.courseId = courseId;
    await doc.save();
  }
  return doc;
}

export async function checkAndUpdateCompletion(userId, moduleId, courseId) {
  const [mod, progressDoc, countsMap] = await Promise.all([
    Module.findById(moduleId).lean().exec(),
    Progress.findOne({ userId, moduleId }).exec(),
    getContentCountsByModule([moduleId]),
  ]);
  if (!mod || !progressDoc) return progressDoc;

  const counts = countsMap.get(String(moduleId)) || {
    lessonCount: 0,
    sopCount: 0,
    hasContent: false,
  };

  const contentDone = isContentFullyViewed(progressDoc, counts);
  const quizDone = !!progressDoc.quizPassed;

  if (contentDone && quizDone) {
    progressDoc.status = "COMPLETED";
  } else if (
    progressDoc.status === "NOT_STARTED" &&
    (contentDone || quizDone || progressDoc.quizAttemptsCount > 0)
  ) {
    progressDoc.status = "IN_PROGRESS";
  } else if (progressDoc.status === "NOT_STARTED" && !contentDone && !quizDone) {
    // keep NOT_STARTED
  } else if (progressDoc.status !== "COMPLETED") {
    progressDoc.status = "IN_PROGRESS";
  }

  progressDoc.percent = computeProgressPercent(progressDoc, counts);
  if (courseId) progressDoc.courseId = courseId;
  await progressDoc.save();
  return progressDoc;
}

export async function buildModuleProgressPayload({
  userId,
  courseId,
  modules,
  progressMap,
  countsMap,
}) {
  return modules.map((mod) => {
    const progress = progressMap.get(String(mod._id)) || null;
    const counts = countsMap.get(String(mod._id)) || {
      lessonCount: 0,
      sopCount: 0,
      hasContent: false,
    };
    const unlocked = isPreviousModuleCompleted(mod, modules, progressMap);
    const displayStatus = deriveDisplayStatus(progress, unlocked);
    const percent = progress
      ? computeProgressPercent(progress, counts)
      : 0;

    return {
      _id: mod._id,
      title: mod.title,
      order: mod.order,
      estimatedDuration: mod.estimatedDuration || "",
      passingPercentage: mod.passingPercentage ?? 70,
      maxQuizAttempts: mod.maxQuizAttempts ?? null,
      status: displayStatus,
      progressPercent: percent,
      quizPassed: !!progress?.quizPassed,
      quizScore: progress?.quizScore ?? null,
      quizAttemptsCount: progress?.quizAttemptsCount ?? 0,
      contentRequirements: {
        lessonsTotal: counts.lessonCount,
        lessonsViewed: (progress?.lessonsViewed || []).length,
        sopsTotal: counts.sopCount,
        sopsViewed: (progress?.sopsViewed || []).length,
        contentRequired: counts.hasContent,
        contentViewed: !!progress?.contentViewed,
      },
      unlocked,
    };
  });
}

export async function isModuleUnlockedForUser(userId, moduleId) {
  const mod = await Module.findById(moduleId).lean().exec();
  if (!mod) return false;
  const modules = await getCourseModulesOrdered(mod.courseId);
  const progressMap = await getProgressMap(
    userId,
    modules.map((m) => m._id)
  );
  return isPreviousModuleCompleted(mod, modules, progressMap);
}

export async function getLatestQuizAttemptCount(userId, moduleId) {
  return QuizAttempt.countDocuments({ userId, moduleId }).exec();
}
