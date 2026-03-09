import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useTimezones } from "@/hooks/use-timezones";
import { useTimeFormat } from "@/hooks/use-time-format";
import { groupTimezonesByGroupName } from "@/utils/timezone-utils";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { TimeComparisonChart } from "@/components/ui/time-comparison-chart";
import { AddTimezoneDialog } from "@/components/ui/add-timezone-dialog";
import { PremiumUpgrade } from "@/components/ui/premium-upgrade";
import { TimezoneCard } from "@/components/ui/timezone-card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSweetAlert } from "@/components/ui/sweet-alert";
import { Plus, Clock, Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, subscription, upgradeMutation, signOut } = useAuth();
  const { showAlert, AlertComponent } = useSweetAlert();
  const { t } = useTranslation();
  const { use24Hour, setUse24Hour } = useTimeFormat();
  const { timezones, isLoading, addTimezone, editTimezone, deleteTimezone } =
    useTimezones(signOut);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTimezone, setEditingTimezone] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toDeleteTimezone, setToDeleteTimezone] = useState(null);

  const isPremium = user?.isPremium || subscription?.plan === "PREMIUM_ANNUAL";
  const isAtFreeLimit = !isPremium && timezones.length >= 3;
  const groupedTimezones = groupTimezonesByGroupName(timezones);

  // Handle add timezone with optimistic updates
  const handleAddTimezone = async (timezone) => {
    if (isAtFreeLimit) {
      showAlert({
        type: "warning",
        title: "Premium required",
        description:
          "You've reached the limit of 3 timezones. Upgrade to premium for unlimited timezones.",
      });
      return;
    }

    const result = await addTimezone(timezone);

    if (result.success) {
      setAddDialogOpen(false);
      showAlert({
        type: "success",
        title: "Timezone added",
        description: "The timezone has been added successfully.",
      });
    } else {
      showAlert({
        type: "error",
        title: "Failed to add timezone",
        description: result.error?.message || "Could not add timezone.",
      });
    }
  };

  // Handle edit timezone with optimistic updates
  const handleEditTimezone = async (id, timezone) => {
    const result = await editTimezone(id, timezone);

    if (result.success) {
      setAddDialogOpen(false);
      showAlert({
        type: "success",
        title: "Timezone updated",
        description: "The timezone has been updated successfully.",
      });
    } else {
      showAlert({
        type: "error",
        title: "Failed to update timezone",
        description: result.error?.message || "Could not update timezone.",
      });
    }
  };

  // Open delete confirmation dialog
  const handleDeleteTimezone = (timezone) => {
    setToDeleteTimezone(timezone);
    setDeleteConfirmOpen(true);
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!toDeleteTimezone) return;

    setDeleteConfirmOpen(false);
    const result = await deleteTimezone(toDeleteTimezone);
    setToDeleteTimezone(null);

    if (result.success) {
      showAlert({
        type: "success",
        title: "Timezone deleted",
        description: "The timezone has been deleted successfully.",
      });
    } else {
      showAlert({
        type: "error",
        title: "Failed to delete timezone",
        description: result.error?.message || "Could not delete timezone.",
      });
    }
  };

  // Open edit dialog with selected timezone
  const handleEditClick = (timezone) => {
    setEditingTimezone(timezone);
    setAddDialogOpen(true);
  };

  // Handle Add or Upgrade button click
  const handleAddOrUpgrade = () => {
    if (isAtFreeLimit) {
      const returnUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/subscription/cancel`;
      upgradeMutation.mutate({ returnUrl, cancelUrl });
    } else {
      setEditingTimezone(null);
      setAddDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col animate-gradient-x bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 transition-colors duration-500">
      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Dashboard Header */}
          <div className="border-b border-gray-200 dark:border-slate-800 pb-5 mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                {t("home.title")}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 font-medium">
                {t("home.subtitle")}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center">
              {/* Timezone Controls Container - pixel-perfect match */}
              <div className="flex items-center bg-slate-100 dark:bg-[#192338] rounded-[14px] p-[3px] dark:shadow-xl border border-slate-200 dark:border-transparent">
                {/* Upgrade to Premium / Add Timezone Button */}
                <button
                  onClick={handleAddOrUpgrade}
                  disabled={
                    isLoading || (isAtFreeLimit && upgradeMutation.isPending)
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-[10px] font-medium text-sm transition-all duration-300 bg-gradient-to-r from-[#2970f5] to-[#1d5bd6] text-white hover:from-[#3a7ef7] hover:to-[#2568e0] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isAtFreeLimit ? (
                    upgradeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                        </svg>
                        <span>Upgrade to Premium</span>
                      </>
                    )
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{t("home.addTimezone")}</span>
                    </>
                  )}
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-5 bg-slate-300 dark:bg-[#3d4f6f] mx-4" />

                {/* 24h/12h Toggle with Switch */}
                <div className="flex items-center gap-2 mr-2">
                  <span
                    className={`text-sm font-medium transition-colors duration-200 ${use24Hour ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-[#7b8ba5]"}`}
                  >
                    24h
                  </span>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => setUse24Hour(!use24Hour)}
                    className="relative w-11 h-[22px] rounded-full bg-slate-300 dark:bg-[#2d3f5e] transition-colors duration-300 focus:outline-none"
                  >
                    <span
                      className={`absolute top-[3px] w-4 h-4 rounded-full bg-[#3b7df5] shadow transition-all duration-300 ${
                        use24Hour ? "left-[3px]" : "left-[25px]"
                      }`}
                    />
                  </button>

                  <span
                    className={`text-sm font-medium transition-colors duration-200 ${!use24Hour ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-[#7b8ba5]"}`}
                  >
                    12h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center h-60">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-gray-500 dark:text-slate-400">
                  Loading timezones...
                </p>
              </div>
            </div>
          )}

          {/* Time comparison chart */}
          {timezones && timezones.length > 0 && (
            <TimeComparisonChart timezones={timezones} use24Hour={use24Hour} />
          )}

          {/* Empty state */}
          {timezones && timezones.length === 0 && !isLoading && (
            <div className="bg-white dark:bg-slate-900 mb-10 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 dark:text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                No timezones added
              </h3>
              <p className="text-gray-500 dark:text-slate-400 mb-4">
                Add your first timezone to get started with TimeSync
              </p>
              <Button
                onClick={() => {
                  setEditingTimezone(null);
                  setAddDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4  " />
                {t("home.addTimezone")}
              </Button>
            </div>
          )}

          {/* Grouped Timezone cards */}
          {timezones && timezones.length > 0 && (
            <div className="mb-5 lg:mb-6 lg:space-y-8 space-y-4">
              {Object.entries(groupedTimezones).map(([groupName, zones]) => (
                <div key={groupName} className="space-y-4">
                  {/* Group Header */}
                  <div className=" border-gray-300 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
                      {groupName}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {zones.length}{" "}
                      {zones.length === 1 ? "timezone" : "timezones"}
                    </p>
                  </div>

                  {/* Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {zones.map((timezone) => (
                      <TimezoneCard
                        key={timezone.id}
                        timezone={timezone}
                        use24Hour={use24Hour}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteTimezone}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Premium upgrade: show to all non-premium users regardless of timezone count */}
          {user && !isPremium && (
            <div id="upgrade">
              <PremiumUpgrade timezoneCount={timezones.length} />
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Add/Edit Timezone Dialog */}
      <AddTimezoneDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddTimezone={handleAddTimezone}
        onEditTimezone={handleEditTimezone}
        editingTimezone={editingTimezone}
        use24Hour={use24Hour}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timezone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {toDeleteTimezone?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sweet Alert Component */}
      {AlertComponent}
    </div>
  );
}
