import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/Axios/AxiosInstance";

// Initial state
const initialState = {
  openings: [],
  currentOpening: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  },
  loading: false,
  detailsLoading: false,
  uploadLoading: false,
  error: null,
};

// Async thunk to fetch all openings
export const fetchOpenings = createAsyncThunk(
  "vendorOpenings/fetchOpenings",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/vendor/openings", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch openings"
      );
    }
  }
);

// Async thunk to fetch opening details
export const fetchOpeningDetails = createAsyncThunk(
  "vendorOpenings/fetchOpeningDetails",
  async (openingId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/vendor/openings/${openingId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch opening details"
      );
    }
  }
);

// Async thunk to generate presigned URLs
export const generatePresignedUrls = createAsyncThunk(
  "vendorOpenings/generatePresignedUrls",
  async ({ openingId, filenames }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/vendor/openings/${openingId}/profiles/presign`,
        { filenames }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to generate presigned URLs"
      );
    }
  }
);

// Async thunk to upload profiles using presigned URLs
export const uploadProfiles = createAsyncThunk(
  "vendorOpenings/uploadProfiles",
  async ({ openingId, uploads }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/vendor/openings/${openingId}/profiles/upload`,
        { uploads }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to upload profiles"
      );
    }
  }
);

// Async thunk to delete a profile
export const deleteProfile = createAsyncThunk(
  "vendorOpenings/deleteProfile",
  async ({ openingId, profileId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `/vendor/openings/${openingId}/profiles/${profileId}`
      );
      return { profileId, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete profile"
      );
    }
  }
);

// Async thunk to get profile download URL
export const getProfileDownloadUrl = createAsyncThunk(
  "vendorOpenings/getProfileDownloadUrl",
  async ({ openingId, profileId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/vendor/openings/${openingId}/profiles/${profileId}/download`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get download URL"
      );
    }
  }
);

const vendorOpeningsSlice = createSlice({
  name: "vendorOpenings",
  initialState,
  reducers: {
    clearCurrentOpening: (state) => {
      state.currentOpening = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch openings
      .addCase(fetchOpenings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpenings.fulfilled, (state, action) => {
        state.loading = false;
        state.openings = action.payload.openings || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchOpenings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch opening details
      .addCase(fetchOpeningDetails.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })
      .addCase(fetchOpeningDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.currentOpening = action.payload;
      })
      .addCase(fetchOpeningDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload;
      })
      // Upload profiles
      .addCase(uploadProfiles.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadProfiles.fulfilled, (state, action) => {
        state.uploadLoading = false;
        // Update profiles count in current opening if available
        if (state.currentOpening && action.payload.uploadedFiles) {
          const successfulUploads = action.payload.uploadedFiles.filter(
            (f) => f.status === "success"
          );
          state.currentOpening.profilesSubmitted += successfulUploads.length;
        }
      })
      .addCase(uploadProfiles.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload;
      })
      // Delete profile
      .addCase(deleteProfile.fulfilled, (state, action) => {
        if (state.currentOpening && state.currentOpening.profiles) {
          state.currentOpening.profiles = state.currentOpening.profiles.filter(
            (p) => p.id !== action.payload.profileId
          );
          state.currentOpening.profilesSubmitted = state.currentOpening.profiles.length;
        }
      })
      .addCase(deleteProfile.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearCurrentOpening, clearError } = vendorOpeningsSlice.actions;
export default vendorOpeningsSlice.reducer;
