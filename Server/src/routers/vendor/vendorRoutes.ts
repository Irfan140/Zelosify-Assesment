import express from "express";
import vendorRequestRoutes from "./vendorRequestRoutes.js";
import vendorOpeningRoutes from "./vendorOpeningRoutes.js";

const router = express.Router();

/**
 * @route /vendor/requests
 * Vendor resource request management
 */
router.use("/requests", vendorRequestRoutes);

/**
 * @route /vendor/openings
 * Vendor opening and profile management
 */
router.use("/openings", vendorOpeningRoutes);

export default router;
