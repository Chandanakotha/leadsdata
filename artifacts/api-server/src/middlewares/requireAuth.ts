import { type RequestHandler } from "express";

const PUBLIC_PATHS = ["/auth/login", "/auth/logout", "/auth/me", "/healthz"];

export const requireAuth: RequestHandler = (req, res, next) => {
  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminPassword) return next(); // auth disabled — dev mode

  const path = req.path;
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p))) {
    return next();
  }

  if (!req.session.authenticated) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
