import React, { useState, useEffect } from"react";
import { useAuth } from"../../context/AuthContext";
import { supabase } from"../../lib/supabase";
import type { Profile } from"../../types";
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  Save,
  CheckCircle,
  AlertCircle,
  HeartHandshake,
} from"lucide-react";

interface MyProfileEditorProps {
  onProfileUpdated?: () => void;
}

function computeYearsInDepEd(appointmentDate?: string | null): number {
  if (!appointmentDate) return 0;
  const parsed = new Date(`${appointmentDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 0;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = (todayMidnight.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return 0;
  return Math.round((diffDays / 365.25) * 10) / 10;
}

export const MyProfileEditor: React.FC<MyProfileEditorProps> = ({ onProfileUpdated }) => {
  const { profile, user, refreshProfile, isAdmin } = useAuth();

  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"personal" |"deped" |"emergency">("personal");

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name ||"",
        first_name: profile.first_name ||"",
        middle_name: profile.middle_name ||"",
        last_name: profile.last_name ||"",
        email: profile.email ||"",
        phone: profile.phone ||"",
        personal_email: profile.personal_email ||"",
        gender: profile.gender ||"Male",
        birthdate: profile.birthdate ||"",
        civil_status: profile.civil_status ||"Single",
        home_address: profile.home_address ||"",
        bio: profile.bio ||"",
        // DepEd 201 File Information
        employee_id: profile.employee_id ||"",
        plantilla_number: profile.plantilla_number ||"",
        tin_number: profile.tin_number ||"",
        gsis_bp_number: profile.gsis_bp_number ||"",
        philhealth_number: profile.philhealth_number ||"",
        pagibig_mid_number: profile.pagibig_mid_number ||"",
        highest_educational_attainment: profile.highest_educational_attainment ||"Bachelor's Degree",
        degree_course: profile.degree_course ||"",
        major_specialization: profile.major_specialization ||"",
        civil_service_eligibility: profile.civil_service_eligibility ||"RA 1080 (LET)",
        date_of_original_appointment: profile.date_of_original_appointment ||"",
        years_in_deped: profile.date_of_original_appointment
          ? computeYearsInDepEd(profile.date_of_original_appointment)
          : profile.years_in_deped || 0,
        department: profile.department ||"Junior High School (JHS)",
        designation: profile.designation ||"Teacher I",
        station_school_id: profile.station_school_id ||"302851",
        station_school_name: profile.station_school_name ||"FERMIN TAYABAS NATIONAL HIGH SCHOOL",
        division: profile.division ||"DIVISION OF BOHOL",
        region: profile.region ||"REGION VII",
        is_teaching: profile.is_teaching ?? true,
        // Emergency Contact
        emergency_contact_name: profile.emergency_contact_name ||"",
        emergency_contact_number: profile.emergency_contact_number ||"",
        emergency_contact_relationship: profile.emergency_contact_relationship ||"",
      });
    }
  }, [profile]);

  const handleChange = (field: keyof Profile, value: unknown) => {
    setFormData((prev) => {
      const next: Partial<Profile> = {
        ...prev,
        [field]: value,
      };
      if (field === "date_of_original_appointment") {
        next.years_in_deped = computeYearsInDepEd(value as string);
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSaveSuccess(null);

      const updates: Record<string, unknown> = {
        full_name: formData.full_name?.trim() || profile.full_name,
        first_name: formData.first_name?.trim() || null,
        middle_name: formData.middle_name?.trim() || null,
        last_name: formData.last_name?.trim() || null,
        phone: formData.phone?.trim() || null,
        personal_email: formData.personal_email?.trim() || null,
        gender: formData.gender || null,
        birthdate: formData.birthdate || null,
        civil_status: formData.civil_status || null,
        home_address: formData.home_address?.trim() || null,
        bio: formData.bio?.trim() || null,
        // DepEd 201 File Information
        employee_id: formData.employee_id?.trim() || null,
        plantilla_number: formData.plantilla_number?.trim() || null,
        tin_number: formData.tin_number?.trim() || null,
        gsis_bp_number: formData.gsis_bp_number?.trim() || null,
        philhealth_number: formData.philhealth_number?.trim() || null,
        pagibig_mid_number: formData.pagibig_mid_number?.trim() || null,
        highest_educational_attainment: formData.highest_educational_attainment || null,
        degree_course: formData.degree_course?.trim() || null,
        major_specialization: formData.major_specialization?.trim() || null,
        civil_service_eligibility: formData.civil_service_eligibility?.trim() || null,
        date_of_original_appointment: formData.date_of_original_appointment || null,
        years_in_deped: formData.date_of_original_appointment
          ? computeYearsInDepEd(formData.date_of_original_appointment)
          : null,
        department: formData.department?.trim() || profile.department,
        designation: formData.designation?.trim() || profile.designation,
        station_school_id: formData.station_school_id ||"302851",
        station_school_name: formData.station_school_name ||"FERMIN TAYABAS NATIONAL HIGH SCHOOL",
        division: formData.division ||"DIVISION OF BOHOL",
        region: formData.region ||"REGION VII",
        is_teaching: formData.is_teaching ?? true,
        // Emergency Contact
        emergency_contact_name: formData.emergency_contact_name?.trim() || null,
        emergency_contact_number: formData.emergency_contact_number?.trim() || null,
        emergency_contact_relationship: formData.emergency_contact_relationship?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      if (onProfileUpdated) onProfileUpdated();
      setSaveSuccess("Your personal profile & DepEd 201 records were successfully updated!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      console.error("[MyProfileEditor] Save Error:", err);
      setErrorMsg(err instanceof Error ? err.message :"Failed to update profile records.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Profile Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#0F3D2E] text-[#F4F1EA] flex items-center justify-center font-semibold text-xl shrink-0">
            {profile?.full_name?.charAt(0) ||"U"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-[#1C2420] font-display">
                {profile?.full_name ||"Faculty Member"}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  profile?.role ==="Super Admin"
                    ?"bg-[#0F3D2E] text-[#FFFFFF]"
                    : profile?.role ==="School Head"
                      ?"bg-[#E6EFEA] text-[#0F3D2E] border border-[#B8CEC5]"
                      :"bg-[#FAF8F5] text-[#1C2420] border border-[#E3DDD1]"
                }`}
              >
                {profile?.role}
              </span>
              {(isAdmin || formData.is_teaching) && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E6EFEA] text-[#0F3D2E] whitespace-nowrap">
                  Instructional Faculty
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[#5C6660] mt-1">
              {profile?.email || user?.email}
            </p>
            <p className="text-xs text-[#5C6660] mt-0.5">
              {formData.designation ||"Teacher"} • {formData.department ||"Junior High School"}
            </p>
          </div>
        </div>

        {/* Quick DepEd Metadata Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3 py-2 bg-[#FAF8F5] border border-[#E3DDD1] rounded-lg">
            <span className="text-[10px] text-[#5C6660] block uppercase font-semibold">
              Station School
            </span>
            <span className="font-semibold text-[#1C2420]">
              FTNHS (ID: 302851)
            </span>
          </div>
          <div className="px-3 py-2 bg-[#FAF8F5] border border-[#E3DDD1] rounded-lg">
            <span className="text-[10px] text-[#5C6660] block uppercase font-semibold">
              Plantilla Item
            </span>
            <span className="font-semibold text-[#1C2420] font-mono">
              {formData.plantilla_number ||"Unassigned"}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {saveSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 shadow-xs"
        >
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 shadow-xs"
        >
          <AlertCircle className="w-4 h-4 text-crimson-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section Sub-Navigation */}
      <div className="border-b border-sand-200">
        <nav className="flex space-x-6 text-xs sm:text-sm font-semibold" aria-label="Profile Form Tabs">
          <button
            type="button"
            onClick={() => setActiveSection("personal")}
            className={`py-3 px-1 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeSection ==="personal"
                ?"border-crimson-600 text-crimson-600"
                :"border-transparent text-sand-600 hover:text-cyprus-900"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal & Contact Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("deped")}
            className={`py-3 px-1 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeSection ==="deped"
                ?"border-crimson-600 text-crimson-600"
                :"border-transparent text-sand-600 hover:text-cyprus-900"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>DepEd 201 File & Plantilla</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("emergency")}
            className={`py-3 px-1 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeSection ==="emergency"
                ?"border-crimson-600 text-crimson-600"
                :"border-transparent text-sand-600 hover:text-cyprus-900"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Emergency Contacts</span>
          </button>
        </nav>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Personal & Contact Information */}
        {activeSection ==="personal" && (
          <div className="bg-white border border-sand-200 rounded-2xl p-6 shadow-xs space-y-6 transition-colors">
            <div>
              <h3 className="text-base font-bold text-cyprus-900">
                Personal & Residential Details
              </h3>
              <p className="text-xs text-sand-600">
                Keep your legal name, contact numbers, and residential information up to date.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="profile-first-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  First Name
                </label>
                <input
                  id="profile-first-name"
                  type="text"
                  value={formData.first_name ||""}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="e.g. Anthony Riel"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="profile-middle-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Middle Name
                </label>
                <input
                  id="profile-middle-name"
                  type="text"
                  value={formData.middle_name ||""}
                  onChange={(e) => handleChange("middle_name", e.target.value)}
                  placeholder="e.g. Del Rosario"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="profile-last-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Last Name
                </label>
                <input
                  id="profile-last-name"
                  type="text"
                  value={formData.last_name ||""}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="e.g. Diango"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="profile-full-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Display Full Name (Official Signature Title)
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  value={formData.full_name ||""}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                  placeholder="e.g. Anthony Riel Diango"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Mobile / Contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-sand-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="profile-phone"
                    type="tel"
                    value={formData.phone ||""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="0912 345 6789"
                    className="w-full py-2 pl-9 pr-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-personal-email" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Personal Alternate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-sand-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="profile-personal-email"
                    type="email"
                    value={formData.personal_email ||""}
                    onChange={(e) => handleChange("personal_email", e.target.value)}
                    placeholder="e.g. personal@gmail.com"
                    className="w-full py-2 pl-9 pr-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-gender" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Biological Gender / Sex
                </label>
                <select
                  id="profile-gender"
                  value={formData.gender ||"Male"}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label htmlFor="profile-birthdate" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Date of Birth
                </label>
                <input
                  id="profile-birthdate"
                  type="date"
                  value={formData.birthdate ||""}
                  onChange={(e) => handleChange("birthdate", e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 font-mono"
                />
              </div>

              <div>
                <label htmlFor="profile-civil-status" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Civil Status
                </label>
                <select
                  id="profile-civil-status"
                  value={formData.civil_status ||"Single"}
                  onChange={(e) => handleChange("civil_status", e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="profile-home-address" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Residential / Home Address
                </label>
                <input
                  id="profile-home-address"
                  type="text"
                  value={formData.home_address ||""}
                  onChange={(e) => handleChange("home_address", e.target.value)}
                  placeholder="Barangay, Municipality, Province, Zip Code"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="profile-bio" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Professional Bio / Teaching Philosophy
                </label>
                <textarea
                  id="profile-bio"
                  rows={2}
                  value={formData.bio ||""}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  placeholder="Brief summary of educational philosophy or professional advocacy..."
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: DepEd 201 File Information */}
        {activeSection ==="deped" && (
          <div className="bg-white border border-sand-200 rounded-2xl p-6 shadow-xs space-y-6 transition-colors">
            <div>
              <h3 className="text-base font-bold text-cyprus-900">
                Official DepEd 201 File & Plantilla Information
              </h3>
              <p className="text-xs text-sand-600">
                Government identification numbers, educational degrees, and civil service eligibility records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="deped-employee-id" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  DepEd Employee ID Number
                </label>
                <input
                  id="deped-employee-id"
                  type="text"
                  value={formData.employee_id ||""}
                  onChange={(e) => handleChange("employee_id", e.target.value)}
                  placeholder="e.g. 6023451"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-plantilla-number" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Plantilla Item Number
                </label>
                <input
                  id="deped-plantilla-number"
                  type="text"
                  value={formData.plantilla_number ||""}
                  onChange={(e) => handleChange("plantilla_number", e.target.value)}
                  placeholder="e.g. OSEC-DECSB-TCH1-540123-2018"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-tin-number" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Tax Identification Number (TIN)
                </label>
                <input
                  id="deped-tin-number"
                  type="text"
                  value={formData.tin_number ||""}
                  onChange={(e) => handleChange("tin_number", e.target.value)}
                  placeholder="123-456-789-000"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-gsis-number" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  GSIS BP Number
                </label>
                <input
                  id="deped-gsis-number"
                  type="text"
                  value={formData.gsis_bp_number ||""}
                  onChange={(e) => handleChange("gsis_bp_number", e.target.value)}
                  placeholder="2000123456"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-philhealth-number" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  PhilHealth Identification No.
                </label>
                <input
                  id="deped-philhealth-number"
                  type="text"
                  value={formData.philhealth_number ||""}
                  onChange={(e) => handleChange("philhealth_number", e.target.value)}
                  placeholder="12-345678901-2"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-pagibig-number" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Pag-IBIG / HDMF MID
                </label>
                <input
                  id="deped-pagibig-number"
                  type="text"
                  value={formData.pagibig_mid_number ||""}
                  onChange={(e) => handleChange("pagibig_mid_number", e.target.value)}
                  placeholder="1212-3434-5656"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              {/* Educational Attainment */}
              <div>
                <label htmlFor="deped-education" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Highest Educational Degree
                </label>
                <select
                  id="deped-education"
                  value={formData.highest_educational_attainment ||"Bachelor's Degree"}
                  onChange={(e) => handleChange("highest_educational_attainment", e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                >
                  <option value="High School Graduate / Vocational">High School / TVET</option>
                  <option value="Bachelor's Degree">Bachelor's Degree (College)</option>
                  <option value="Post-Graduate Diploma / Units">Post-Graduate Units</option>
                  <option value="Master's Degree (Complete)">Master's Degree (MA/MS/MAEd)</option>
                  <option value="Doctoral Units">Doctoral Units</option>
                  <option value="Doctorate Degree (PhD/EdD)">Doctorate Degree (PhD/EdD)</option>
                </select>
              </div>

              <div>
                <label htmlFor="deped-degree" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Course Degree Title
                </label>
                <input
                  id="deped-degree"
                  type="text"
                  value={formData.degree_course ||""}
                  onChange={(e) => handleChange("degree_course", e.target.value)}
                  placeholder="e.g. Bachelor of Secondary Education"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-major" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Major / Specialization
                </label>
                <input
                  id="deped-major"
                  type="text"
                  value={formData.major_specialization ||""}
                  onChange={(e) => handleChange("major_specialization", e.target.value)}
                  placeholder="e.g. ICT / Mathematics"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-eligibility" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Civil Service Eligibility
                </label>
                <input
                  id="deped-eligibility"
                  type="text"
                  value={formData.civil_service_eligibility ||""}
                  onChange={(e) => handleChange("civil_service_eligibility", e.target.value)}
                  placeholder="e.g. RA 1080 (LET) / PBET"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-appointment-date" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Date of Original DepEd Appointment
                </label>
                <input
                  id="deped-appointment-date"
                  type="date"
                  value={formData.date_of_original_appointment ||""}
                  onChange={(e) => handleChange("date_of_original_appointment", e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="deped-years-service" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Total Years in DepEd Service{" "}
                  <span className="font-normal text-sand-600">(Auto)</span>
                </label>
                <input
                  id="deped-years-service"
                  type="number"
                  step="0.1"
                  readOnly
                  value={
                    formData.date_of_original_appointment
                      ? computeYearsInDepEd(formData.date_of_original_appointment)
                      : 0
                  }
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-sand-50 text-sm font-mono font-semibold text-cyprus-900 focus:outline-hidden"
                />
                <p className="text-[10px] text-sand-500 mt-1">
                  Auto-calculated from Current Date − Appointment Date
                </p>
              </div>

              <div className="sm:col-span-3 pt-3 border-t border-sand-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_teaching_checkbox"
                    checked={formData.is_teaching ?? true}
                    onChange={(e) => handleChange("is_teaching", e.target.checked)}
                    className="w-4 h-4 text-crimson-600 rounded border-sand-300 focus:ring-crimson-500"
                  />
                  <label htmlFor="is_teaching_checkbox" className="text-xs font-bold text-cyprus-900 cursor-pointer">
                    Performs Active Classroom Teaching Duties (Subject Loading & Lesson Logs)
                  </label>
                </div>
                <p className="text-[11px] text-sand-600 mt-0.5 pl-6">
                  Check this box if you have teaching responsibilities (Teachers, Head Teachers, and Super Admins who also handle student loads). Non-teaching support personnel may uncheck this to suppress instructional tasks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Emergency Contacts */}
        {activeSection ==="emergency" && (
          <div className="bg-white border border-sand-200 rounded-2xl p-6 shadow-xs space-y-6 transition-colors">
            <div>
              <h3 className="text-base font-bold text-cyprus-900">
                In Case of Emergency (ICE) Information
              </h3>
              <p className="text-xs text-sand-600">
                Designate immediate family members or legal contacts for institutional emergency records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ice-name" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Contact Person Full Name
                </label>
                <input
                  id="ice-name"
                  type="text"
                  value={formData.emergency_contact_name ||""}
                  onChange={(e) => handleChange("emergency_contact_name", e.target.value)}
                  placeholder="e.g. Juana Dela Cruz"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="ice-relationship" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Relationship to Personnel
                </label>
                <input
                  id="ice-relationship"
                  type="text"
                  value={formData.emergency_contact_relationship ||""}
                  onChange={(e) => handleChange("emergency_contact_relationship", e.target.value)}
                  placeholder="e.g. Spouse / Sibling / Parent"
                  className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                />
              </div>

              <div>
                <label htmlFor="ice-phone" className="block text-xs font-semibold text-cyprus-900 mb-1">
                  Emergency Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-sand-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="ice-phone"
                    type="tel"
                    value={formData.emergency_contact_number ||""}
                    onChange={(e) => handleChange("emergency_contact_number", e.target.value)}
                    placeholder="0918 765 4321"
                    className="w-full py-2 pl-9 pr-3 rounded-lg border border-sand-300 bg-white text-sm font-mono font-medium text-cyprus-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="flex justify-end gap-3 pt-4 border-t border-sand-200">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ?"Saving 201 Records..." :"Save Profile Details"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
