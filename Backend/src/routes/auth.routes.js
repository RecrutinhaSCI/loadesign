// src/routes/auth.routes.js
const { Router } = require("express");
const { login, me, changePassword } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");
const { loginRateLimit } = require("../middlewares/loginRateLimit");

const router = Router();

router.post("/login", loginRateLimit, login);
router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
