import { Response } from "express";
import prisma from "../../../config/prisma/prisma.js";
import { AuthenticatedRequest } from "../../../types/typeIndex.js";
import { FilePresignService } from "../../../services/upload/filePresignService.js";

// Allowed file extensions for profile uploads
const ALLOWED_EXTENSIONS = [".pdf", ".pptx", ".ppt"];
const MAX_FILES_PER_REQUEST = 10;

/**
 * Generate presigned URLs for profile uploads
 * 
 * @route POST /api/v1/vendor/openings/:id/profiles/presign
 */
export const generatePresignedUrls = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: openingId } = req.params;
  const { filenames } = req.body;
  const tenantId = req.user?.tenant?.tenantId;
  const userId = req.user?.id;

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

  // Validate filenames array
  if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
    res.status(400).json({
      status: "error",
      message: "Filenames array is required and must not be empty",
    });
    return;
  }

  // Validate file count limit
  if (filenames.length > MAX_FILES_PER_REQUEST) {
    res.status(400).json({
      status: "error",
      message: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request`,
    });
    return;
  }

  // Validate file extensions
  const invalidFiles = filenames.filter((filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
    return !ALLOWED_EXTENSIONS.includes(ext);
  });

  if (invalidFiles.length > 0) {
    res.status(400).json({
      status: "error",
      message: `Invalid file types. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      invalidFiles,
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
      select: { id: true, status: true },
    });

    if (!opening) {
      res.status(404).json({
        status: "error",
        message: "Opening not found or access denied",
      });
      return;
    }

    // Check if opening is still accepting profiles
    if (opening.status === "CLOSED") {
      res.status(400).json({
        status: "error",
        message: "This opening is closed and no longer accepting profiles",
      });
      return;
    }

    // Generate presigned URLs using the existing FilePresignService
    const presignService = new FilePresignService();
    const uploadTokens = await presignService.generateUploadTokens(
      filenames,
      {
        tenantId,
        s3KeyConfig: {
          // Path structure: <tenantId>/<openingId>/<timestamp>_<filename>
          pathSegments: [tenantId, openingId],
          includeTimestamp: true,
        },
        uploadEndpoint: "s3",
        customMetadata: {
          openingId,
          uploadedBy: userId,
        },
      }
    );

    res.status(200).json({
      status: "success",
      message: "Upload tokens generated successfully",
      data: {
        uploads: uploadTokens,
      },
    });
  } catch (error) {
    console.error("Error generating presigned URLs:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate upload URLs",
      details: (error as Error).message,
    });
  }
};
