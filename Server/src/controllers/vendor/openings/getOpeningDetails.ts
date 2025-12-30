import { Response } from "express";
import prisma from "../../../config/prisma/prisma.js";
import { AuthenticatedRequest } from "../../../types/typeIndex.js";

/**
 * Fetch detailed information for a specific opening
 * Includes profiles submitted and profile list
 * 
 * @route GET /api/v1/vendor/openings/:id
 */
export const getOpeningDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: openingId } = req.params;
  const tenantId = req.user?.tenant?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      status: "error",
      message: "Tenant information not found. Access denied.",
    });
    return;
  }

  if (!openingId) {
    res.status(400).json({
      status: "error",
      message: "Opening ID is required",
    });
    return;
  }

  try {
    // Fetch opening with tenant isolation
    const opening = await prisma.opening.findFirst({
      where: {
        id: openingId,
        tenantId,
      },
      include: {
        hiringProfiles: {
          where: { isDeleted: false },
          select: {
            id: true,
            s3Key: true,
            status: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!opening) {
      res.status(404).json({
        status: "error",
        message: "Opening not found or access denied",
      });
      return;
    }

    // Fetch hiring manager details
    const hiringManager = await prisma.user.findUnique({
      where: { id: opening.hiringManagerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Extract filename from s3Key for profile display
    const profiles = opening.hiringProfiles.map((profile) => {
      // Extract filename from S3 key (last part after timestamp)
      const keyParts = profile.s3Key.split("/");
      const fullFilename = keyParts[keyParts.length - 1];
      // Remove timestamp prefix if present (format: timestamp_filename)
      const fileName = fullFilename.includes("_")
        ? fullFilename.substring(fullFilename.indexOf("_") + 1)
        : fullFilename;

      return {
        id: profile.id,
        fileName,
        status: profile.status,
        submittedAt: profile.submittedAt,
      };
    });

    res.status(200).json({
      id: opening.id,
      title: opening.title,
      description: opening.description,
      location: opening.location,
      contractType: opening.contractType,
      experienceMin: opening.experienceMin,
      experienceMax: opening.experienceMax,
      postedDate: opening.postedDate,
      expectedCompletionDate: opening.expectedCompletionDate,
      status: opening.status,
      hiringManager: hiringManager
        ? {
            id: hiringManager.id,
            name: `${hiringManager.firstName || ""} ${hiringManager.lastName || ""}`.trim() || "Unknown",
            email: hiringManager.email,
          }
        : {
            id: opening.hiringManagerId,
            name: "Unknown",
            email: "unknown@example.com",
          },
      profilesSubmitted: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("Error fetching opening details:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch opening details",
      details: (error as Error).message,
    });
  }
};
