import { body, query, param } from "express-validator";

export const createPostValidator = [
  body("type").isIn(["discussion", "question"]).withMessage("Type must be 'discussion' or 'question'"),
  body("title").trim().isLength({ min: 5, max: 300 }).withMessage("Title must be 5–300 characters"),
  body("body").trim().isLength({ min: 10, max: 10000 }).withMessage("Body must be 10–10000 characters"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("tags").optional().isArray({ max: 10 }),
  body("tags.*").optional().trim().isLength({ max: 50 }),
];

export const addReplyValidator = [
  param("id").isMongoId().withMessage("Invalid post ID"),
  body("body").trim().isLength({ min: 1, max: 5000 }).withMessage("Reply must be 1–5000 characters"),
];

export const editReplyValidator = [
  param("id").isMongoId().withMessage("Invalid post ID"),
  param("replyId").isMongoId().withMessage("Invalid reply ID"),
  body("body").trim().isLength({ min: 1, max: 5000 }).withMessage("Reply must be 1–5000 characters"),
];

export const postQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("type").optional().isIn(["discussion", "question"]),
  query("status").optional().isIn(["open", "resolved", "closed"]),
  query("sort").optional().isIn(["recent", "views"]),
  query("q").optional().trim().isLength({ max: 200 }),
  query("category").optional().trim().isLength({ max: 100 }),
];
