import { Response } from "express";
import prisma from "../../../config/prisma/prisma.js";
import { AuthenticatedRequest } from "../../../types/typeIndex.js";
import { createStorageService } from "../../../services/storage/storageFactory.js";

/**
 * Get presigned download URL for a profile
 * Ensures profiles are viewable without direct S3 communication
 * 
 * @route GET /api/v1/vendor/openings/:id/profiles/:profileId/download
 */
export const getProfileDownloadUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: openingId, profileId } = req.params;
  const tenantId = req.user?.tenant?.tenantId;

  // Validate tenant access
  if (!tenantId) {
    res.status(403).json({
      status: "error",
      message: "Tenant information not found. Access denied.",
    });
    return;
  }

  // Validate opening ID
  if (!openingId) {
    res.status(400).json({
      status: "error",
      message: "Opening ID is required",
    });
    return;
  }

  // Validate profile ID
  if (!profileId) {
    res.status(400).json({
      status: "error",
      message: "Profile ID is required",
    });
    return;
  }

  const profileIdNum = parseInt(profileId, 10);
  if (isNaN(profileIdNum)) {
    res.status(400).json({
      status: "error",
      message: "Profile ID must be a valid number",
    });
    return;
  }

  try {
    // Verify opening exists and belongs to tenant
    const opening = await prisma.opening.findFirst({
      where: {
        id: openingId,
        tenantId,
      },
      select: { id: true },
    });

    if (!opening) {
      res.status(404).json({
        status: "error",
        message: "Opening not found or access denied",
      });
      return;
    }

    // Find the profile
    const profile = await prisma.hiringProfile.findFirst({
      where: {
        id: profileIdNum,
        openingId,
        isDeleted: false,
      },
      select: {
        id: true,
        s3Key: true,
      },
    });

    if (!profile) {
      res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
      return;
    }

    // Generate presigned download URL using storage service
    const storageService = createStorageService();
    const downloadUrl = await storageService.getObjectURL(profile.s3Key);

    // Extract filename from s3Key
    const keyParts = profile.s3Key.split("/");
    const fullFilename = keyParts[keyParts.length - 1];
    const fileName = fullFilename.includes("_")
      ? fullFilename.substring(fullFilename.indexOf("_") + 1)
      : fullFilename;

    res.status(200).json({
      status: "success",
      data: {
        profileId: profile.id,
        fileName,
        downloadUrl,
        expiresIn: "15 minutes", // Typical presigned URL expiry
      },
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate download URL",
      details: (error as Error).message,
    });
  }
};
