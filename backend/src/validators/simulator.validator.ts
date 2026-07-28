import { body, param } from "express-validator";

const leverField = (name: string) =>
  body(`levers.${name}`)
    .optional()
    .isFloat({ min: 0 })
    .withMessage(`${name} must be a non-negative number`);

export const runSimulationValidator = [
  body("cityId").optional().trim().isString(),
  body("name").optional().trim().isLength({ max: 200 }),
  body("presetId").optional().trim().isString(),
  leverField("ev"),
  leverField("traffic"),
  leverField("trees"),
  leverField("industry"),
  leverField("renewable"),
  leverField("publicTransport"),
  leverField("wasteManagement"),
  leverField("greenArea"),
];

export const compareScenariosValidator = [
  body("cityId").optional().trim().isString(),
  body("scenarioA").isObject().withMessage("scenarioA is required"),
  body("scenarioB").isObject().withMessage("scenarioB is required"),
  body("scenarioA.levers").isObject().withMessage("scenarioA.levers is required"),
  body("scenarioB.levers").isObject().withMessage("scenarioB.levers is required"),
];

export const exportSimulationValidator = [
  body("simulationId").optional().isMongoId().withMessage("Invalid simulation ID"),
  body("cityId").optional().trim().isString(),
];

export const simulationIdParamValidator = [
  param("id").isMongoId().withMessage("Invalid simulation ID"),
];
