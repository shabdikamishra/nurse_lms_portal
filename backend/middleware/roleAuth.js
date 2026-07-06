export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const getRequestUser = req.app.locals.getRequestUser;
      if (!getRequestUser) {
        return res.status(500).json({ message: "Auth not configured" });
      }
      const user = await getRequestUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = user;
      return next();
    } catch (err) {
      console.error("requireRole error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

export function requireAdminOrSupervisor() {
  return requireRole("admin", "supervisor");
}

export function requireAdminOnly() {
  return requireRole("admin");
}
