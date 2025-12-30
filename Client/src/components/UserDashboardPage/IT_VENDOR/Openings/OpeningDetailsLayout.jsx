"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Briefcase,
  Upload,
  File,
  Trash2,
  Download,
  X,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  fetchOpeningDetails,
  generatePresignedUrls,
  deleteProfile,
  getProfileDownloadUrl,
  clearCurrentOpening,
} from "@/redux/features/Dashboard/Vendor/vendorOpeningsSlice";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import { Button } from "@/components/UI/shadcn/button";
import { toast } from "sonner";
import axiosInstance from "@/utils/Axios/AxiosInstance";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Allowed file types
const ALLOWED_FILE_TYPES = [".pdf", ".pptx", ".ppt"];
const MAX_FILES = 10;

export default function OpeningDetailsLayout() {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useParams();
  const openingId = params.openingId;
  const fileInputRef = useRef(null);

  const { currentOpening, detailsLoading, uploadLoading, error } = useSelector(
    (state) => state.vendorOpenings
  );

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch opening details on mount
  useEffect(() => {
    if (openingId) {
      dispatch(fetchOpeningDetails(openingId));
    }
    return () => {
      dispatch(clearCurrentOpening());
    };
  }, [dispatch, openingId]);

  // Handle file selection
  const handleFileSelect = useCallback((files) => {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!ALLOWED_FILE_TYPES.includes(ext)) {
        errors.push(`${file.name}: Invalid file type. Allowed: PDF, PPTX`);
      } else if (selectedFiles.length + validFiles.length >= MAX_FILES) {
        errors.push(`${file.name}: Maximum ${MAX_FILES} files allowed`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setUploadErrors((prev) => [...prev, ...errors]);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, [selectedFiles.length]);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e) => {
      handleFileSelect(e.target.files);
      e.target.value = ""; // Reset input
    },
    [handleFileSelect]
  );

  // Remove selected file
  const removeSelectedFile = useCallback((index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Clear upload errors
  const clearErrors = useCallback(() => {
    setUploadErrors([]);
  }, []);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadErrors([]);
    setUploadProgress({});

    try {
      const filenames = selectedFiles.map((f) => f.name);

      // Step 1: Generate upload tokens from backend
      const presignResult = await dispatch(
        generatePresignedUrls({ openingId, filenames })
      ).unwrap();

      // Backend returns tokens in data.uploads format
      const uploadTokens = presignResult.data?.uploads || presignResult.uploads || [];
      
      if (!uploadTokens || uploadTokens.length === 0) {
        throw new Error("Failed to generate upload tokens");
      }

      // Step 2: Upload files via form-data to backend (backend handles S3 upload)
      // Create FormData with files and their corresponding tokens
      const formData = new FormData();
      
      selectedFiles.forEach((file, index) => {
        formData.append("files", file);
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: { progress: 0, status: "uploading" },
        }));
      });

      // Add upload tokens as JSON array
      const tokens = uploadTokens.map(t => t.uploadToken);
      formData.append("uploadTokens", JSON.stringify(tokens));

      // Upload using axios with progress tracking
      const uploadResponse = await axiosInstance.post(
        `/vendor/openings/${openingId}/profiles/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            // Update progress for all files
            selectedFiles.forEach((file) => {
              setUploadProgress((prev) => ({
                ...prev,
                [file.name]: { progress, status: "uploading" },
              }));
            });
          },
        }
      );

      // Mark all as success
      selectedFiles.forEach((file) => {
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: { progress: 100, status: "success" },
        }));
      });

      // Check response for any failed uploads
      const uploadedFiles = uploadResponse.data.uploadedFiles || [];
      const successCount = uploadedFiles.filter(f => f.status === "success").length;
      const failedFiles = uploadedFiles.filter(f => f.status === "failed");

      if (failedFiles.length > 0) {
        failedFiles.forEach(f => {
          setUploadErrors((prev) => [...prev, `${f.filename}: ${f.error}`]);
          setUploadProgress((prev) => ({
            ...prev,
            [f.filename]: { progress: 0, status: "error" },
          }));
        });
      }

      // Refresh opening details to get updated profiles list
      dispatch(fetchOpeningDetails(openingId));
      
      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} profile(s)`);
      }

      // Clear selected files
      setSelectedFiles([]);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Upload failed";
      setUploadErrors((prev) => [...prev, errorMessage]);
      toast.error(errorMessage);
      
      // Mark all as error
      selectedFiles.forEach((file) => {
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: { progress: 0, status: "error" },
        }));
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, openingId, dispatch]);

  // Handle profile delete
  const handleDeleteProfile = useCallback(
    async (profileId) => {
      try {
        await dispatch(deleteProfile({ openingId, profileId })).unwrap();
        setDeleteConfirmId(null);
        // Refresh opening details
        dispatch(fetchOpeningDetails(openingId));
        toast.success("Profile deleted successfully");
      } catch (err) {
        console.error("Delete error:", err);
        toast.error(err.message || "Failed to delete profile");
      }
    },
    [openingId, dispatch]
  );

  // Handle profile download
  const handleDownloadProfile = useCallback(
    async (profileId) => {
      setDownloadingId(profileId);
      try {
        const result = await dispatch(
          getProfileDownloadUrl({ openingId, profileId })
        ).unwrap();

        // Backend returns data in { data: { downloadUrl } } format
        const downloadUrl = result.data?.downloadUrl || result.downloadUrl;
        
        if (downloadUrl) {
          // Open the download URL in a new tab
          window.open(downloadUrl, "_blank");
        } else {
          throw new Error("Download URL not available");
        }
      } catch (err) {
        console.error("Download error:", err);
        toast.error(err.message || "Failed to download profile");
      } finally {
        setDownloadingId(null);
      }
    },
    [openingId, dispatch]
  );

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      OPEN: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900",
      CLOSED: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900",
      ON_HOLD: "text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900",
      SUBMITTED: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900",
      SHORTLISTED: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900",
      REJECTED: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status] || statusColors.SUBMITTED}`}>
        {status}
      </span>
    );
  };

  // Loading skeleton
  if (detailsLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-56 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentOpening) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Error Loading Opening</h2>
            <p className="text-secondary mb-6">{error}</p>
            <Button onClick={() => router.push("/vendor/openings")} size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Openings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOpening) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="p-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push("/vendor/openings")}
              className="p-2.5 hover:bg-accent rounded-lg transition-colors border border-border"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">
                {currentOpening.title}
              </h1>
              <StatusBadge status={currentOpening.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Opening Details Card */}
              <div className="border border-border rounded-lg bg-background shadow-sm">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Opening Details
                  </h2>
                </div>
                <div className="p-6">
                  {/* Description */}
                  {currentOpening.description && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-secondary mb-2">Description</h3>
                      <p className="text-foreground text-sm leading-relaxed">
                        {currentOpening.description}
                      </p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    {currentOpening.location && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <MapPin className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-0.5">Location</p>
                          <p className="text-sm text-foreground font-medium">{currentOpening.location}</p>
                        </div>
                      </div>
                    )}

                    {currentOpening.contractType && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <Briefcase className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-0.5">Contract Type</p>
                          <p className="text-sm text-foreground font-medium">{currentOpening.contractType}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <Calendar className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <p className="text-xs text-secondary mb-0.5">Posted Date</p>
                        <p className="text-sm text-foreground font-medium">{formatDate(currentOpening.postedDate)}</p>
                      </div>
                    </div>

                    {currentOpening.expectedCompletionDate && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <Clock className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-0.5">Expected Completion</p>
                          <p className="text-sm text-foreground font-medium">
                            {formatDate(currentOpening.expectedCompletionDate)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <p className="text-xs text-secondary mb-0.5">Experience Required</p>
                        <p className="text-sm text-foreground font-medium">
                          {currentOpening.experienceMin}
                          {currentOpening.experienceMax ? ` - ${currentOpening.experienceMax}` : "+"} years
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Profiles */}
              <div className="border border-border rounded-lg bg-background shadow-sm">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Uploaded Profiles
                  </h2>
                  <span className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-foreground rounded-full">
                    {currentOpening.profilesSubmitted || 0}
                  </span>
                </div>
                <div className="p-6">
                  {currentOpening.profiles && currentOpening.profiles.length > 0 ? (
                    <div className="space-y-3">
                      {currentOpening.profiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {profile.fileName}
                              </p>
                              <p className="text-xs text-secondary mt-0.5">
                                Submitted: {formatDate(profile.submittedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={profile.status} />
                            <button
                              onClick={() => handleDownloadProfile(profile.id)}
                              disabled={downloadingId === profile.id}
                              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 border border-border"
                              title="Download"
                            >
                              {downloadingId === profile.id ? (
                                <Loader2 className="w-4 h-4 text-secondary animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 text-secondary" />
                              )}
                            </button>
                            {deleteConfirmId === profile.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteProfile(profile.id)}
                                  className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(profile.id)}
                                className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-border"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-secondary" />
                      </div>
                      <p className="text-foreground font-medium mb-1">No profiles uploaded</p>
                      <p className="text-secondary text-sm">
                        Upload candidate profiles using the form on the right
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Hiring Manager Card */}
              <div className="border border-border rounded-lg bg-background shadow-sm">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Hiring Manager
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-foreground font-semibold text-lg">
                      {currentOpening.hiringManager?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {currentOpening.hiringManager?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-secondary mt-0.5">
                        {currentOpening.hiringManager?.email || ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Profiles Card */}
              {currentOpening.status !== "CLOSED" && (
                <div className="border border-border rounded-lg bg-background shadow-sm">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                      Upload Profiles
                    </h2>
                  </div>
                  <div className="p-6">
                    <p className="text-xs text-secondary mb-4">
                      Supported formats: PDF, PPTX (Max {MAX_FILES} files)
                    </p>

                    {/* Upload Errors */}
                    {uploadErrors.length > 0 && (
                      <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">
                            Upload Errors
                          </p>
                          <button onClick={clearErrors} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded">
                            <X className="w-4 h-4 text-red-700 dark:text-red-400" />
                          </button>
                        </div>
                        {uploadErrors.map((error, index) => (
                          <p key={index} className="text-xs text-red-600 dark:text-red-400">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-border hover:border-secondary hover:bg-accent/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.pptx,.ppt"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6 text-secondary" />
                      </div>
                      <p className="text-sm text-foreground font-medium">
                        Drag & drop files here
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        or click to browse
                      </p>
                    </div>

                    {/* Selected Files */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Selected Files ({selectedFiles.length})
                        </p>
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-accent/50 border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <File className="w-4 h-4 text-secondary flex-shrink-0" />
                              <span className="text-sm text-foreground truncate">
                                {file.name}
                              </span>
                            </div>
                            {uploadProgress[file.name] ? (
                              <div className="flex items-center gap-2">
                                {uploadProgress[file.name].status === "uploading" && (
                                  <span className="text-xs text-secondary font-medium">
                                    {uploadProgress[file.name].progress}%
                                  </span>
                                )}
                                {uploadProgress[file.name].status === "success" && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {uploadProgress[file.name].status === "error" && (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSelectedFile(index);
                                }}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                              >
                                <X className="w-4 h-4 text-secondary" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    <Button
                      onClick={handleUpload}
                      disabled={selectedFiles.length === 0 || isUploading}
                      className="w-full mt-4"
                      size="lg"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Closed Opening Notice */}
              {currentOpening.status === "CLOSED" && (
                <div className="border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 shadow-sm">
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                          Opening Closed
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          This opening is no longer accepting new profiles
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
