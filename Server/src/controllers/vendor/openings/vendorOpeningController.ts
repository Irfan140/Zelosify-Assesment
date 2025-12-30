import { Request, Response } from "express";
import { getOpenings as getOpeningsImpl } from "./getOpenings.js";
import { getOpeningDetails as getOpeningDetailsImpl } from "./getOpeningDetails.js";
import { generatePresignedUrls as generatePresignedUrlsImpl } from "./generatePresignedUrls.js";
import { uploadProfiles as uploadProfilesImpl } from "./uploadProfiles.js";
import { deleteProfile as deleteProfileImpl } from "./deleteProfile.js";
import { getProfileDownloadUrl as getProfileDownloadUrlImpl } from "./getProfileDownloadUrl.js";

/**
 * Vendor Opening Controller
 * Handles all vendor-related opening endpoints with error handling
 */

/**
 * GET /api/v1/vendor/openings
 * Fetch all available openings with pagination
 */
export const getOpenings = async (req: Request, res: Response) => {
  try {
    await getOpeningsImpl(req, res);
  } catch (error) {
    console.error("Error in getOpenings:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
};

/**
 * GET /api/v1/vendor/openings/:id
 * Fetch detailed information for a specific opening
 */
export const getOpeningDetails = async (req: Request, res: Response) => {
  try {
    await getOpeningDetailsImpl(req, res);
  } catch (error) {
    console.error("Error in getOpeningDetails:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
};

/**
 * POST /api/v1/vendor/openings/:id/profiles/presign
 * Generate presigned URLs for profile uploads
 */
export const generatePresignedUrls = async (req: Request, res: Response) => {
  try {
    await generatePresignedUrlsImpl(req, res);
  } catch (error) {
    console.error("Error in generatePresignedUrls:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
};

/**
 * POST /api/v1/vendor/openings/:id/profiles/upload
 * Submit/Update uploaded profiles
 */
export const uploadProfiles = async (req: Request, res: Response) => {
  try {
    await uploadProfilesImpl(req as any, res);
  } catch (error) {
    console.error("Error in uploadProfiles:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
};

/**
 * DELETE /api/v1/vendor/openings/:id/profiles/:profileId
 * Soft delete a profile
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    await deleteProfileImpl(req, res);
  } catch (error) {
    console.error("Error in deleteProfile:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
};

/**
 * GET /api/v1/vendor/openings/:id/profiles/:profileId/download
 * Get presigned download URL for a profile
 */
export const getProfileDownloadUrl = async (req: Request, res: Response) => {
  try {
    await getProfileDownloadUrlImpl(req, res);
  } catch (error) {
    console.error("Error in getProfileDownloadUrl:", error);
    res.status(500).json({
      status: "error",
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
};
