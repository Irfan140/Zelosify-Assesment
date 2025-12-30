import { Response } from "express";
import prisma from "../../../config/prisma/prisma.js";
import { AuthenticatedRequest } from "../../../types/typeIndex.js";

/**
 * Fetch all available openings for a vendor
 * Implements pagination and tenant-based isolation
 * 
 * @route GET /api/v1/vendor/openings
 */
export const getOpenings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // Get user tenant for isolation
  const tenantId = req.user?.tenant?.tenantId;

  if (!tenantId) {
    res.status(403).json({
      status: "error",
      message: "Tenant information not found. Access denied.",
    });
    return;
  }

  // Parse pagination parameters
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const itemsPerPage = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const skip = (page - 1) * itemsPerPage;

  try {
    // Get total count for pagination
    const totalItems = await prisma.opening.count({
      where: { tenantId },
    });

    // Fetch openings with hiring manager details
    const openings = await prisma.opening.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        location: true,
        contractType: true,
        postedDate: true,
        status: true,
        hiringManagerId: true,
      },
      orderBy: { postedDate: "desc" },
      skip,
      take: itemsPerPage,
    });

    // Fetch hiring manager details for each opening
    const hiringManagerIds = [...new Set(openings.map((o) => o.hiringManagerId))];
    const hiringManagers = await prisma.user.findMany({
      where: { id: { in: hiringManagerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Create a map for quick lookup
    const hiringManagerMap = new Map(
      hiringManagers.map((hm) => [
        hm.id,
        {
          id: hm.id,
          name: `${hm.firstName || ""} ${hm.lastName || ""}`.trim() || "Unknown",
          email: hm.email,
        },
      ])
    );

    // Format response
    const formattedOpenings = openings.map((opening) => ({
      id: opening.id,
      title: opening.title,
      location: opening.location,
      contractType: opening.contractType,
      postedDate: opening.postedDate,
      status: opening.status,
      hiringManager: hiringManagerMap.get(opening.hiringManagerId) || {
        id: opening.hiringManagerId,
        name: "Unknown",
        email: "unknown@example.com",
      },
    }));

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    res.status(200).json({
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      },
      openings: formattedOpenings,
    });
  } catch (error) {
    console.error("Error fetching openings:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch openings",
      details: (error as Error).message,
    });
  }
};
