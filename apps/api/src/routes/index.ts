import { Hono } from "hono";
import type { AppContext } from "../types";
import healthRouter from "./health";
import studyRouter from "./study";

const router = new Hono<AppContext>();

router.route("/health", healthRouter);
router.route("/study", studyRouter);

export default router;
