import { Response } from "express";
import prisma from "../../../config/prisma/prisma.js";
import { AuthenticatedRequest } from "../../../types/typeIndex.js";

/**
 * Soft delete a candidate profile
 * Sets isDeleted flag to true instead of physically deleting
 * Uses Prisma transaction for ACID compliance
 * 
 * @route DELETE /api/v1/vendor/openings/:id/profiles/:profileId
 */
export const deleteProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: openingId, profileId } = req.params;
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
    // Use transaction for ACID compliance
    const result = await prisma.$transaction(async (tx) => {
      // Verify opening exists and belongs to tenant
      const opening = await tx.opening.findFirst({
        where: {
          id: openingId,
          tenantId,
        },
        select: { id: true },
      });

      if (!opening) {
        return { error: "Opening not found or access denied", status: 404 };
      }

      // Find the profile
      const profile = await tx.hiringProfile.findFirst({
        where: {
          id: profileIdNum,
          openingId,
          isDeleted: false,
        },
        select: {
          id: true,
          s3Key: true,
          uploadedBy: true,
        },
      });

      if (!profile) {
        return { error: "Profile not found or already deleted", status: 404 };
      }

      // Optional: Check if user can delete this profile
      // Currently allowing deletion by any vendor from the same tenant
      // Uncomment below to restrict to profile uploader only:
      // if (profile.uploadedBy !== userId) {
      //   return { error: "You can only delete profiles you uploaded", status: 403 };
      // }

      // Soft delete the profile
      await tx.hiringProfile.update({
        where: { id: profileIdNum },
        data: { isDeleted: true },
      });

      return { success: true, profileId: profile.id };
    });

    if ("error" in result) {
      res.status(result.status || 500).json({
        status: "error",
        message: result.error,
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Profile deleted successfully",
      data: {
        profileId: result.profileId,
      },
    });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete profile",
      details: (error as Error).message,
    });
  }
};
