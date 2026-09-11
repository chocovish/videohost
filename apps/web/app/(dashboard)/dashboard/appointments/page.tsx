"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Sparkles,
  Clock,
  CalendarCheck,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OfferingsTab from "@/components/appointments/OfferingsTab";
import AvailabilityTab from "@/components/appointments/AvailabilityTab";
import ScheduledAppointmentsTab from "@/components/appointments/ScheduledAppointmentsTab";
import { AppointmentOfferingItem } from "@/components/appointments/OfferingModal";

export default function AppointmentsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"offerings" | "availability" | "scheduled">("offerings");
  const [offerings, setOfferings] = useState<AppointmentOfferingItem[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const fetchUpcomingCount = async () => {
    try {
      const res = await fetch("/api/appointments?filter=all");
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setUpcomingCount(data.stats.upcoming ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch upcoming appointments count:", err);
    }
  };

  const fetchOfferings = async () => {
    try {
      setIsLoadingOfferings(true);
      const res = await fetch("/api/appointments/offerings");
      if (res.ok) {
        const data = await res.json();
        setOfferings(data.offerings || []);
      }
    } catch (err) {
      console.error("Failed to fetch offerings:", err);
    } finally {
      setIsLoadingOfferings(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/appointments/offerings");
      if (res.ok) {
        const data = await res.json();
        setOfferings(data.offerings || []);
      }
      await fetchUpcomingCount();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
    fetchUpcomingCount();
    const handleAppointmentsUpdated = () => {
      fetchUpcomingCount();
    };
    window.addEventListener("appointment-updated", handleAppointmentsUpdated);
    window.addEventListener("notifications-refresh", handleAppointmentsUpdated);
    return () => {
      window.removeEventListener("appointment-updated", handleAppointmentsUpdated);
      window.removeEventListener("notifications-refresh", handleAppointmentsUpdated);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-primary shrink-0" />
            Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calendly-style scheduling: define appointment offerings, control your weekly availability, and manage client bookings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="cursor-pointer gap-1.5"
            title="Refresh appointments data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <Button
          variant={activeTab === "offerings" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("offerings")}
          className="gap-2 cursor-pointer font-bold text-xs sm:text-sm"
        >
          <Layers className="w-4 h-4" />
          <span>Appointment offerings</span>
          {offerings.length > 0 && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold min-w-[22px] text-center ${
                activeTab === "offerings"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {offerings.length}
            </span>
          )}
        </Button>

        <Button
          variant={activeTab === "availability" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("availability")}
          className="gap-2 cursor-pointer font-bold text-xs sm:text-sm"
        >
          <Clock className="w-4 h-4" />
          <span>Availability control</span>
        </Button>

        <Button
          variant={activeTab === "scheduled" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("scheduled")}
          className="gap-2 cursor-pointer font-bold text-xs sm:text-sm"
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Scheduled appointments</span>
          {upcomingCount > 0 && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold min-w-[22px] text-center ${
                activeTab === "scheduled"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
              title={`${upcomingCount} upcoming appointment${upcomingCount === 1 ? "" : "s"}`}
            >
              {upcomingCount > 99 ? "99+" : upcomingCount}
            </span>
          )}
        </Button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "offerings" && (
          <OfferingsTab
            offerings={offerings}
            onOfferingsChange={setOfferings}
            isLoading={isLoadingOfferings}
          />
        )}

        {activeTab === "availability" && <AvailabilityTab />}

        {activeTab === "scheduled" && (
          <ScheduledAppointmentsTab onStatsChange={(stats) => setUpcomingCount(stats.upcoming)} />
        )}
      </div>
    </div>
  );
}

