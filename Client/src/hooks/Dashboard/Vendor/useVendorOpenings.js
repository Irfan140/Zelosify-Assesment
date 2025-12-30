import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOpenings,
  fetchOpeningDetails,
  generatePresignedUrls,
  uploadProfiles,
  deleteProfile,
  getProfileDownloadUrl,
  clearCurrentOpening,
  clearError,
} from "@/redux/features/Dashboard/Vendor/vendorOpeningsSlice";

/**
 * Custom hook for managing vendor openings
 * Provides access to openings state and actions
 */
export const useVendorOpenings = () => {
  const dispatch = useDispatch();
  const {
    openings,
    currentOpening,
    pagination,
    loading,
    detailsLoading,
    uploadLoading,
    error,
  } = useSelector((state) => state.vendorOpenings);

  // Fetch all openings with pagination
  const getOpenings = useCallback(
    (page = 1, limit = 10) => {
      return dispatch(fetchOpenings({ page, limit }));
    },
    [dispatch]
  );

  // Fetch single opening details
  const getOpeningDetails = useCallback(
    (openingId) => {
      return dispatch(fetchOpeningDetails(openingId));
    },
    [dispatch]
  );

  // Generate presigned URLs for file upload
  const getPresignedUrls = useCallback(
    (openingId, filenames) => {
      return dispatch(generatePresignedUrls({ openingId, filenames }));
    },
    [dispatch]
  );

  // Submit uploaded profiles
  const submitProfiles = useCallback(
    (openingId, uploads) => {
      return dispatch(uploadProfiles({ openingId, uploads }));
    },
    [dispatch]
  );

  // Soft delete a profile
  const removeProfile = useCallback(
    (openingId, profileId) => {
      return dispatch(deleteProfile({ openingId, profileId }));
    },
    [dispatch]
  );

  // Get download URL for a profile
  const downloadProfile = useCallback(
    (openingId, profileId) => {
      return dispatch(getProfileDownloadUrl({ openingId, profileId }));
    },
    [dispatch]
  );

  // Clear current opening from state
  const resetCurrentOpening = useCallback(() => {
    dispatch(clearCurrentOpening());
  }, [dispatch]);

  // Clear error from state
  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    openings,
    currentOpening,
    pagination,
    loading,
    detailsLoading,
    uploadLoading,
    error,
    // Actions
    getOpenings,
    getOpeningDetails,
    getPresignedUrls,
    submitProfiles,
    removeProfile,
    downloadProfile,
    resetCurrentOpening,
    resetError,
  };
};

export default useVendorOpenings;
