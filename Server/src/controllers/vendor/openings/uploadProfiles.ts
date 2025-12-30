import { Response } from "express";
import prisma from "../../../config/prisma/prisma.js";
import { AuthenticatedRequest } from "../../../types/typeIndex.js";
import { FileUploadService } from "../../../services/upload/fileUploadService.js";

/**
 * Extended Request interface with files from multer
 */
interface MulterAuthenticatedRequest extends AuthenticatedRequest {
  files?: Express.Multer.File[];
}

/**
 * Submit/Update uploaded profiles
 * Handles both new profile creation and updating existing profiles
 * Uses Prisma transactions for ACID compliance
 *
 * Supports two modes:
 * 1. Form-data with files: files[] (actual files) + uploadTokens[] (encrypted tokens)
 * 2. JSON body: uploads[] with { uploadToken, s3Key } for presigned URL flow
 *
 * @route POST /api/v1/vendor/openings/:id/profiles/upload
 */
export const uploadProfiles = async (
  req: MulterAuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: openingId } = req.params;
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

  // Validate user ID
  if (!userId) {
    res.status(403).json({
      status: "error",
      message: "User information not found. Access denied.",
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

  // Get files from multer (form-data) or from JSON body
  const files = req.files || [];

  // Get upload tokens - can be from form-data (string or array) or JSON body
  let uploadTokens: string[] = [];
  if (req.body.uploadTokens) {
    // Handle both single token and array of tokens from form-data
    if (Array.isArray(req.body.uploadTokens)) {
      uploadTokens = req.body.uploadTokens;
    } else if (typeof req.body.uploadTokens === "string") {
      // Could be a JSON string array or a single token
      try {
        const parsed = JSON.parse(req.body.uploadTokens);
        uploadTokens = Array.isArray(parsed) ? parsed : [req.body.uploadTokens];
      } catch {
        uploadTokens = [req.body.uploadTokens];
      }
    }
  }

  // Also support JSON body with uploads array (for presigned URL flow)
  const uploadsFromBody = req.body.uploads;
  const isJsonMode =
    uploadsFromBody &&
    Array.isArray(uploadsFromBody) &&
    uploadsFromBody.length > 0;

  // Validate that we have either files with tokens OR JSON uploads
  if (!isJsonMode && (files.length === 0 || uploadTokens.length === 0)) {
    res.status(400).json({
      status: "error",
      message:
        "Either files[] with uploadTokens[], or uploads[] array is required",
    });
    return;
  }

  // Validate that files count matches tokens count (for form-data mode)
  if (!isJsonMode && files.length !== uploadTokens.length) {
    res.status(400).json({
      status: "error",
      message: `Mismatch: ${files.length} files provided but ${uploadTokens.length} upload tokens`,
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

    // Check if opening is accepting profiles
    if (opening.status === "CLOSED") {
      res.status(400).json({
        status: "error",
        message: "This opening is closed and no longer accepting profiles",
      });
      return;
    }

    const uploadService = new FileUploadService();

    // Results array matching the expected assessment format
    const uploadedFiles: Array<{
      filename: string;
      uploadedAt: string;
      status: "success" | "failed";
      s3Key?: string;
      size?: number;

      error?: string;
    }> = [];

    // Prepare upload items based on mode
    interface ProcessedUpload {
      file?: Express.Multer.File;
      uploadToken?: string;
      s3Key?: string;
    }

    let uploadsToProcess: ProcessedUpload[] = [];

    if (isJsonMode) {
      // JSON mode: uploads array with s3Key or uploadToken
      uploadsToProcess = uploadsFromBody.map(
        (item: { s3Key?: string; uploadToken?: string }) => ({
          s3Key: item.s3Key,
          uploadToken: item.uploadToken,
        })
      );
    } else {
      // Form-data mode: pair files with tokens
      uploadsToProcess = files.map((file, index) => ({
        file,
        uploadToken: uploadTokens[index],
      }));
    }

    // STEP 1: Upload files to S3 OUTSIDE the transaction (slow network operations)
    interface S3UploadResult {
      s3Key: string;
      filename: string;
      size: number;
    }
    const s3UploadedFiles: S3UploadResult[] = [];

    for (const uploadItem of uploadsToProcess) {
      const uploadedAt = new Date().toISOString();

      // Mode 1: s3Key provided directly (presigned URL upload already completed)
      if (uploadItem.s3Key) {
        const keyParts = uploadItem.s3Key.split("/");
        const fullFilename = keyParts[keyParts.length - 1];
        const filename = fullFilename.includes("_")
          ? fullFilename.substring(fullFilename.indexOf("_") + 1)
          : fullFilename;

        s3UploadedFiles.push({
          s3Key: uploadItem.s3Key,
          filename,
          size: 0, // Size unknown for presigned URL uploads
        });
      }
      // Mode 2: Form-data with actual file and upload token
      else if (uploadItem.file && uploadItem.uploadToken) {
        const file = uploadItem.file;

        try {
          // Upload file using the service with the token
          const uploadResult = await uploadService.uploadFile(
            {
              uploadToken: uploadItem.uploadToken,
              fileBuffer: file.buffer,
              mimeType: file.mimetype || "application/octet-stream",
            },
            {
              validateTokenFn: (metadata) => {
                // Validate that token is for this opening
                if (metadata.customFields?.openingId !== openingId) {
                  return {
                    isValid: false,
                    errorMessage: "Token is not valid for this opening",
                  };
                }
                return { isValid: true };
              },
            }
          );

          if (!uploadResult.success) {
            uploadedFiles.push({
              filename: file.originalname || "unknown",
              uploadedAt,
              status: "failed",
              error: uploadResult.errorMessage || "Upload failed",
            });
            continue;
          }

          s3UploadedFiles.push({
            s3Key: uploadResult.key,
            filename: uploadResult.filename || file.originalname,
            size: file.size,
          });
        } catch (uploadError) {
          uploadedFiles.push({
            filename: file.originalname || "unknown",
            uploadedAt,
            status: "failed",
            error: (uploadError as Error).message,
          });
        }
      }
      // Mode 3: JSON with uploadToken but no file (invalid)
      else if (uploadItem.uploadToken && !uploadItem.file) {
        uploadedFiles.push({
          filename: "unknown",
          uploadedAt,
          status: "failed",
          error:
            "uploadToken provided without file. Use form-data with files[] or provide s3Key for presigned URL flow.",
        });
      } else {
        uploadedFiles.push({
          filename: "unknown",
          uploadedAt,
          status: "failed",
          error:
            "Invalid upload item: requires either s3Key or file with uploadToken",
        });
      }
    }

    // STEP 2: Create/update database records INSIDE the transaction (fast DB operations only)
    if (s3UploadedFiles.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const { s3Key, filename, size } of s3UploadedFiles) {
          const uploadedAt = new Date().toISOString();

          try {
            // Check for existing profile with same s3Key
            const existingProfile = await tx.hiringProfile.findFirst({
              where: {
                s3Key,
                openingId,
                isDeleted: false,
              },
            });

            if (existingProfile) {
              // Update existing profile (resubmission)
              await tx.hiringProfile.update({
                where: { id: existingProfile.id },
                data: {
                  submittedAt: new Date(),
                  status: "SUBMITTED",
                },
              });

              uploadedFiles.push({
                filename,
                uploadedAt,
                status: "success",
                s3Key,
                size,
              });
            } else {
              // Create new profile
              const newProfile = await tx.hiringProfile.create({
                data: {
                  openingId,
                  s3Key,
                  uploadedBy: userId,
                  status: "SUBMITTED",
                  recommended: false,
                },
              });

              uploadedFiles.push({
                filename,
                uploadedAt,
                status: "success",
                s3Key,
                size,
              });
            }
          } catch (dbError) {
            console.error("Error creating profile record:", dbError);
            uploadedFiles.push({
              filename,
              uploadedAt,
              status: "failed",
              s3Key,
              error: (dbError as Error).message,
            });
          }
        }
      });
    }

    const successCount = uploadedFiles.filter(
      (r) => r.status === "success"
    ).length;
    const failedCount = uploadedFiles.filter(
      (r) => r.status === "failed"
    ).length;

    res.status(200).json({
      status: failedCount === 0 ? "success" : "partial",
      message:
        failedCount === 0
          ? "Profiles uploaded successfully"
          : `${successCount} profile(s) uploaded, ${failedCount} failed`,
      data: {
        uploadedFiles,
        totalFiles: uploadedFiles.length,
      },
    });
  } catch (error) {
    console.error("Error uploading profiles:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to upload profiles",
      details: (error as Error).message,
    });
  }
};
