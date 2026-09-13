import { Hono } from "hono";
import type { AppContext } from "../types";
import healthRouter from "./health";
import studyRouter from "./study";
import emailRouter from "./email";

const router = new Hono<AppContext>();

router.route("/health", healthRouter);
router.route("/study", studyRouter);
router.route("/email", emailRouter);

export default router;
