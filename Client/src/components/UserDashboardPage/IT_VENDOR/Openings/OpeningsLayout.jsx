"use client";
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { ArrowLeft, Filter, Search, MapPin, Calendar, User, Briefcase } from "lucide-react";
import { fetchOpenings } from "@/redux/features/Dashboard/Vendor/vendorOpeningsSlice";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import { toast } from "sonner";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function OpeningsLayout() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { openings, pagination, loading, error } = useSelector(
    (state) => state.vendorOpenings
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch openings on mount
  useEffect(() => {
    dispatch(fetchOpenings({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle row click to navigate to details
  const handleOpeningClick = useCallback(
    (opening) => {
      router.push(`/vendor/openings/${opening.id}`);
    },
    [router]
  );

  // Handle pagination
  const handlePageChange = useCallback(
    (newPage) => {
      dispatch(fetchOpenings({ page: newPage, limit: pagination.itemsPerPage }));
    },
    [dispatch, pagination.itemsPerPage]
  );

  // Filter openings based on search term
  const filteredOpenings = openings.filter((opening) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      opening.title?.toLowerCase().includes(searchLower) ||
      opening.location?.toLowerCase().includes(searchLower) ||
      opening.contractType?.toLowerCase().includes(searchLower) ||
      opening.hiringManager?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Loading skeleton
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, index) => (
        <tr key={index} className="border-b border-border">
          <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
          <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </td>
          <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
        </tr>
      ))}
    </>
  );

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      OPEN: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900",
      CLOSED: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900",
      ON_HOLD: "text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status] || statusColors.OPEN}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Openings</h1>
          </div>

          {/* Filter and Search */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <button className="px-4 py-2 bg-foreground text-background text-sm rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity">
              Filter
              <Filter className="w-4 h-4" />
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
              <input
                type="text"
                placeholder="Search openings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-64"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-tableHeader">
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary">
                    Contract Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary">
                    Posted Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary">
                    Hiring Manager
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-primary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : filteredOpenings.length > 0 ? (
                  filteredOpenings.map((opening) => (
                    <tr
                      key={opening.id}
                      className="border-b border-border hover:bg-tableHeader cursor-pointer transition-colors"
                      onClick={() => handleOpeningClick(opening)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {opening.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {opening.location || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {opening.contractType || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDate(opening.postedDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-foreground font-medium">
                            {opening.hiringManager?.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "?"}
                          </div>
                          <span className="text-sm text-foreground">
                            {opening.hiringManager?.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={opening.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Briefcase className="w-12 h-12 text-secondary opacity-50" />
                        <p className="text-foreground font-medium">No openings found</p>
                        <p className="text-secondary text-sm">
                          {searchTerm
                            ? "Try adjusting your search criteria"
                            : "There are no openings available at the moment"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-secondary">
                Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
                {Math.min(
                  pagination.currentPage * pagination.itemsPerPage,
                  pagination.totalItems
                )}{" "}
                of {pagination.totalItems} results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 text-sm border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                >
                  Previous
                </button>
                {[...Array(pagination.totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className={`px-4 py-2 text-sm border rounded-md transition-colors ${
                      pagination.currentPage === index + 1
                        ? "bg-foreground text-background border-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-4 py-2 text-sm border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
