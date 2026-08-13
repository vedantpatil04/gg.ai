import { Router }  from "express";
import {
  getPosts, getPost, createPost,
  addReply, markBestAnswer, editReply, deleteReply,
} from "../controllers/community.controller";
import { authenticate }        from "../middleware/auth";
import { validate }            from "../middleware/validate";
import {
  createPostValidator, addReplyValidator,
  editReplyValidator, postQueryValidator,
} from "../validators/community.validator";

const router = Router();

import { param } from "express-validator";

// Public: list + detail
router.get("/",          postQueryValidator, validate, getPosts);
router.get("/:id",       param("id").isMongoId().withMessage("Invalid post ID"), validate, getPost);

// Authenticated: create, reply
router.use(authenticate);
router.post("/",                                      createPostValidator, validate, createPost);
router.post("/:id/replies",                           addReplyValidator, validate, addReply);
router.patch("/:id/replies/:replyId",                 editReplyValidator, validate, editReply);
router.delete("/:id/replies/:replyId",                deleteReply);
router.post("/:id/replies/:replyId/best-answer",      markBestAnswer);

export default router;
