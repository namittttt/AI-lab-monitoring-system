import { Router } from "express";
import { signup, login, logout } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// ✅ Current user
router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;


// import {Router} from "express"
// import { signup,login,logout } from "../controllers/auth.controller.js"
// import { protectRoute } from "../middleware/auth.middleware.js"

// const router = Router();

// router.route("/signup").post(signup);
// router.route("/login").post(login);
// router.route("/logout").post(logout);

// router.route("/me").get(protectRoute,(req,res)=>{
//     res.status(200).json({success:true, user:req.user})
// })

// export default router;