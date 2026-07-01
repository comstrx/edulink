/**
 * BookingSection — Slot selection and booking request UI for mentor profiles.
 * Sprint B2-B
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMentorSlots, useRequestMentorSession, type GeneratedSlot } from "@/hooks/useMentorBooking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface BookingSectionProps {
  mentorId: string;
  mentorName: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const BookingSection = ({ mentorId, mentorName }: BookingSectionProps) => {
  const { user } = useAuth();
  const { slots, isLoading } = useMentorSlots(mentorId);
  const requestMutation = useRequestMentorSession();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"select" | "confirm" | "done">("select");

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, GeneratedSlot[]> = {};
    slots.forEach((slot) => {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    });
    return grouped;
  }, [slots]);

  const availableDates = Object.keys(slotsByDate).sort();

  // Paginate dates (show 5 at a time)
  const [datePageStart, setDatePageStart] = useState(0);
  const visibleDates = availableDates.slice(datePageStart, datePageStart + 5);

  const handleSelectSlot = (slot: GeneratedSlot) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    try {
      await requestMutation.mutateAsync({
        mentor_id: mentorId,
        scheduled_at: selectedSlot.isoStart,
        duration_minutes: 60,
        notes: notes.trim() || undefined,
        session_type: "general",
      });
      setStep("done");
      toast.success("Session request sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to request session");
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setNotes("");
    setStep("select");
  };

  // Not authenticated
  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Book a Mentoring Session</h3>
          <p className="text-sm text-muted-foreground">Sign in to request a session with {mentorName}.</p>
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (step === "done") {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Session Requested!</h3>
          <p className="text-sm text-muted-foreground">
            Your session request has been sent to {mentorName}. You'll be notified once they confirm.
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Book Another Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Confirm step
  if (step === "confirm" && selectedSlot) {
    const slotDate = new Date(selectedSlot.isoStart);
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Confirm Booking
          </h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {FULL_DAY_NAMES[slotDate.getDay()]}, {slotDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedSlot.startTime} – {selectedSlot.endTime} · 60 minutes
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What would you like to discuss?"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
              Back
            </Button>
            <Button onClick={handleConfirmBooking} disabled={requestMutation.isPending} className="flex-1">
              {requestMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Requesting…</>
              ) : (
                "Request Session"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No slots available
  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <h3 className="font-semibold text-foreground">No Available Slots</h3>
          <p className="text-sm text-muted-foreground">
            This mentor has no available time slots in the next {LOOKAHEAD_DAYS} days. Check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Select step
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Book a Mentoring Session
        </h3>

        {/* Date selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Select a date</p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={datePageStart === 0}
                onClick={() => setDatePageStart(Math.max(0, datePageStart - 5))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={datePageStart + 5 >= availableDates.length}
                onClick={() => setDatePageStart(datePageStart + 5)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            {visibleDates.map((date) => {
              const d = new Date(date + "T00:00:00");
              const isSelected = selectedDate === date;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 rounded-lg border p-2 text-center transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  }`}
                >
                  <p className="text-xs font-medium">{DAY_NAMES[d.getDay()]}</p>
                  <p className="text-lg font-semibold">{d.getDate()}</p>
                  <p className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-US", { month: "short" })}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && slotsByDate[selectedDate] && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Available times
            </p>
            <div className="grid grid-cols-3 gap-2">
              {slotsByDate[selectedDate].map((slot) => (
                <Button
                  key={slot.isoStart}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSelectSlot(slot)}
                >
                  {slot.startTime}
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedDate && !slotsByDate[selectedDate]?.length && (
          <p className="text-sm text-muted-foreground text-center py-4">No slots on this date.</p>
        )}
      </CardContent>
    </Card>
  );
};

const LOOKAHEAD_DAYS = 14;

export default BookingSection;
