import React, { useState } from"react";
import type {
  CalendarEventType,
  TargetAudience,
  SchoolCalendarEvent,
  AcademicTerm,
} from"../../types";
import { createCalendarEvent } from"../../services/calendarAttendanceService";
import { Calendar, X, AlertTriangle, CheckCircle2 } from"lucide-react";

interface NewCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerm: AcademicTerm | null;
  userId: string;
  onEventCreated: (event: SchoolCalendarEvent) => void;
}

const EVENT_TYPES: CalendarEventType[] = [
"Division Activity",
"School Event",
"DepEd Holiday",
"Exam Period",
"Submission Deadline",
"Faculty Meeting",
];

const AUDIENCES: TargetAudience[] = [
"All",
"Teachers",
"Students",
"Junior High School",
"Senior High School",
];

export const NewCalendarEventModal: React.FC<NewCalendarEventModalProps> = ({
  isOpen,
  onClose,
  activeTerm,
  userId,
  onEventCreated,
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0] ||""
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0] ||""
  );
  const [eventType, setEventType] = useState<CalendarEventType>("School Event");
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("All");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) {
      setErrorMessage("Please complete the required title and dates.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMessage("End date cannot be earlier than start date.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await createCalendarEvent({
        term_id: activeTerm?.id || null,
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
        event_type: eventType,
        target_audience: targetAudience,
        created_by: userId,
      });

      if (created) {
        onEventCreated(created);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :"Failed to create event.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white border border-sand-300 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-cyprus-900 text-white flex items-center justify-between border-b border-cyprus-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-crimson-600/20 border border-crimson-500/40 flex items-center justify-center text-crimson-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 id="calendar-modal-title" className="text-base font-bold font-display text-white">
                Add Calendar Event or Deadline
              </h2>
              <p className="text-xs text-sand-300">
                Institutional Calendar & DepEd Schedules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-800 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-crimson-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="event-title-input"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Event Title / Activity Name
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Term 1 Summative Exam Week"
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="event-type-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Event Category
              </label>
              <select
                id="event-type-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="event-audience-select"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Target Audience
              </label>
              <select
                id="event-audience-select"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="event-start-date"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                Start Date
              </label>
              <input
                id="event-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            <div>
              <label
                htmlFor="event-end-date"
                className="block text-xs font-semibold text-cyprus-900 mb-1"
              >
                End Date
              </label>
              <input
                id="event-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="event-desc-input"
              className="block text-xs font-semibold text-cyprus-900 mb-1"
            >
              Description / Notes (Optional)
            </label>
            <textarea
              id="event-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Schedule of venue, attire, or requirements..."
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-white text-cyprus-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-sand-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-sand-300 text-cyprus-900 text-xs font-semibold hover:bg-sand-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
