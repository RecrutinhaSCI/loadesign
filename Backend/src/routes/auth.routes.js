// src/routes/auth.routes.js
const { Router } = require("express");
const { login, me, changePassword } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
