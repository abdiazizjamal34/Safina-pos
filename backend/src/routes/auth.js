const router = require('express').Router();
const ctrl = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { validate, rules: v } = require('../middleware/validate');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,                          // 50 attempts per 15 min (demo-friendly)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' }
});

const signupValidation = validate({
  name:         [v.required, v.minLength(2)],
  email:        [v.required, v.isEmail],
  password:     [v.required, v.minLength(8)],
  businessName: [v.required, v.minLength(2)],
});

const loginValidation = validate({
  email:    [v.required, v.isEmail],
  password: [v.required],
});

router.post('/signup', signupValidation, ctrl.signup);
router.post('/login',  limiter, loginValidation, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout',  ctrl.logout);

module.exports = router;
