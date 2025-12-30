import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/features/Auth/authSlice";
import vendorOpeningsReducer from "@/redux/features/Dashboard/Vendor/vendorOpeningsSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    vendorOpenings: vendorOpeningsReducer,
  },
});

export default store;
