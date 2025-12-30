import { Router, type RequestHandler } from "express";
import { authenticateUser } from "../../middlewares/auth/authenticateMiddleware.js";
import { authorizeRole } from "../../middlewares/auth/authorizeMiddleware.js";
import { uploadConfig } from "../../config/multer/multerConfig.js";
import {
  getOpenings,
  getOpeningDetails,
  generatePresignedUrls,
  uploadProfiles,
  deleteProfile,
  getProfileDownloadUrl,
} from "../../controllers/controllers.js";

/**
 * Router for vendor opening management endpoints
 * All routes require authentication and IT_VENDOR role
 * 
 * Endpoints:
 * - GET    /                           - Fetch all openings (paginated)
 * - GET    /:id                        - Fetch opening details
 * - POST   /:id/profiles/presign       - Generate presigned URLs for profile upload
 * - POST   /:id/profiles/upload        - Submit/Update uploaded profiles
 * - DELETE /:id/profiles/:profileId    - Soft delete a profile
 * - GET    /:id/profiles/:profileId/download - Get presigned download URL
 */
const router = Router();

// Apply authentication and authorization to all routes
const authMiddleware: RequestHandler[] = [
  authenticateUser as RequestHandler,
  authorizeRole("IT_VENDOR") as RequestHandler,
];

/**
 * =============================================================================
 * OPENINGS LIST & DETAILS ROUTES
 * =============================================================================
 */

/**
 * GET /api/v1/vendor/openings
 * Fetch all available openings with pagination
 * @requires IT_VENDOR role
 */
router.get("/", ...authMiddleware, getOpenings as RequestHandler);

/**
 * GET /api/v1/vendor/openings/:id
 * Fetch detailed information for a specific opening
 * @requires IT_VENDOR role
 */
router.get("/:id", ...authMiddleware, getOpeningDetails as RequestHandler);

/**
 * =============================================================================
 * PROFILE MANAGEMENT ROUTES
 * =============================================================================
 */

/**
 * POST /api/v1/vendor/openings/:id/profiles/presign
 * Generate presigned URLs for profile uploads
 * @requires IT_VENDOR role
 * @body { filenames: string[] }
 */
router.post(
  "/:id/profiles/presign",
  ...authMiddleware,
  generatePresignedUrls as RequestHandler
);

/**
 * POST /api/v1/vendor/openings/:id/profiles/upload
 * Submit/Update uploaded profiles
 * Supports two modes:
 * 1. Form-data: files[] (actual files) + uploadTokens[] (encrypted tokens)
 * 2. JSON body: uploads[] with { s3Key } for presigned URL flow
 * @requires IT_VENDOR role
 */
router.post(
  "/:id/profiles/upload",
  ...authMiddleware,
  uploadConfig.array("files", 20) as RequestHandler, // Allow up to 20 files
  uploadProfiles as RequestHandler
);

/**
 * DELETE /api/v1/vendor/openings/:id/profiles/:profileId
 * Soft delete a profile
 * @requires IT_VENDOR role
 */
router.delete(
  "/:id/profiles/:profileId",
  ...authMiddleware,
  deleteProfile as RequestHandler
);

/**
 * GET /api/v1/vendor/openings/:id/profiles/:profileId/download
 * Get presigned download URL for a profile
 * @requires IT_VENDOR role
 */
router.get(
  "/:id/profiles/:profileId/download",
  ...authMiddleware,
  getProfileDownloadUrl as RequestHandler
);

export default router;
