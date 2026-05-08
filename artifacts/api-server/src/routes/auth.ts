import { Router, type IRouter } from "express";

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}

const router: IRouter = Router();

const authStatus = (authenticated: boolean) => ({
  authenticated,
  authRequired: !!process.env["ADMIN_PASSWORD"],
});

router.get("/auth/me", (req, res): void => {
  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminPassword) {
    res.json(authStatus(true));
    return;
  }
  res.json(authStatus(!!req.session.authenticated));
});

router.post("/auth/login", (req, res): void => {
  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminPassword) {
    res.json(authStatus(true));
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  req.session.authenticated = true;
  res.json(authStatus(true));
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json(authStatus(false));
  });
});

export default router;
