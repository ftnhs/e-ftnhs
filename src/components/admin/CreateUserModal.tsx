import React, { useState, useEffect } from"react";
import { schoolReferenceService } from"../../services/schoolReferenceService";
import type { UserRole, UserStatus } from"../../types";
import { X, UserPlus, Eye, EyeOff, AlertCircle } from"lucide-react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
  onCreate: (payload: {
    email: string;
    password?: string;
    full_name: string;
    role: UserRole;
    department?: string;
    designation?: string;
    status: UserStatus;
  }) => Promise<void>;
}

const COMMON_DEPARTMENTS = [
"Junior High School (JHS)",
"Senior High School (SHS)",
"Science & Technology",
"Mathematics",
"English",
"Filipino",
"Araling Panlipunan",
"MAPEH",
"TVL / TLE",
"Edukasyon sa Pagpapakatao (EsP)",
"Administrative & Personnel Services",
"Office of the School Registrar",
"Finance & Cashiering",
"Guidance & Counseling",
"Health & Nutrition Clinic",
"Library & Learning Resources",
"General Services & Security",
"ICT & System Administration",
];

const TEACHING_DESIGNATIONS = [
"Teacher I",
"Teacher II",
"Teacher III",
"Master Teacher I",
"Master Teacher II",
"Head Teacher I",
"Head Teacher III",
];

const NON_TEACHING_DESIGNATIONS = [
"Administrative Officer II (AO II)",
"Administrative Assistant II (ADAS II)",
"Administrative Assistant III (ADAS III)",
"Registrar I / Records Officer",
"Guidance Counselor I",
"School Nurse I",
"School Librarian I",
"Property Custodian / Supply Officer",
"Security Guard",
"Utility Worker I",
];

const ADMIN_DESIGNATIONS = [
"Lead Super Admin / ICT Coordinator",
"Secondary School Principal IV",
"Assistant Principal II",
"System Administrator",
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
  onCreate,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("FTNHS@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("Teacher");
  const [department, setDepartment] = useState("Junior High School (JHS)");
  const [customDepartment, setCustomDepartment] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(COMMON_DEPARTMENTS);
  const [designation, setDesignation] = useState("Teacher I");
  const [customDesignation, setCustomDesignation] = useState("");
  const [status, setStatus] = useState<UserStatus>("Approved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    schoolReferenceService.fetchDepartments().then((depts) => {
      if (isMounted && depts && depts.length > 0) {
        const dbNames = depts.filter((d) => d.is_active).map((d) => d.dept_name);
        setDepartmentOptions(Array.from(new Set([...dbNames, ...COMMON_DEPARTMENTS])));
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole ==="Non-Teaching") {
      setDepartment("Administrative & Personnel Services");
      setDesignation("Administrative Officer II (AO II)");
    } else if (newRole ==="School Head") {
      setDepartment("Office of the Principal");
      setDesignation("Secondary School Principal IV");
    } else if (newRole ==="Super Admin") {
      setDepartment("ICT & System Administration");
      setDesignation("Lead Super Admin / ICT Coordinator");
    } else {
      setDepartment("Junior High School (JHS)");
      setDesignation("Teacher I");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMsg("Full name and email address are mandatory.");
      return;
    }

    const finalDepartment = department ==="OTHER" ? customDepartment.trim() : department;
    const finalDesignation = designation ==="OTHER" ? customDesignation.trim() : designation;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onCreate({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || undefined,
        role,
        department: finalDepartment,
        designation: finalDesignation,
        status,
      });
      onUserCreated();
      onClose();
    } catch (err: unknown) {
      console.error("[CreateUserModal] Error:", err);
      setErrorMsg(err instanceof Error ? err.message :"Failed to create user account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const designationsList =
    role ==="Non-Teaching"
      ? NON_TEACHING_DESIGNATIONS
      : role ==="Teacher"
        ? TEACHING_DESIGNATIONS
        : ADMIN_DESIGNATIONS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white border border-sand-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-sand-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyprus-900 text-deped-gold-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-user-title" className="text-base font-bold text-cyprus-900">
                Register New Personnel
              </h2>
              <p className="text-xs text-sand-600">
                Provision a faculty or non-teaching staff account for e-FTNHS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-600 hover:bg-sand-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label htmlFor="user-fullname" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Full Name <span className="text-crimson-600">*</span>
              </label>
              <input
                id="user-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Dolores Santos"
                required
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              />
            </div>

            {/* Email Address */}
            <div className="sm:col-span-2">
              <label htmlFor="user-email" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Official Email Address <span className="text-crimson-600">*</span>
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. maria.santos@deped.gov.ph"
                required
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600 font-mono"
              />
            </div>

            {/* Initial Password */}
            <div className="sm:col-span-2">
              <label htmlFor="user-password" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Initial Account Password
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ?"text" :"password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defaults to FTNHS@2026"
                  className="w-full py-2 pl-3 pr-10 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sand-500 hover:text-cyprus-900 cursor-pointer"
                  aria-label={showPassword ?"Hide password" :"Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-sand-600">
                User can log in immediately using this email and temporary password.
              </p>
            </div>

            {/* System Role */}
            <div>
              <label htmlFor="user-role" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Institutional Role <span className="text-crimson-600">*</span>
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-semibold text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                <option value="Teacher">Teacher (Instructional Faculty)</option>
                <option value="Non-Teaching">Non-Teaching Personnel (Staff)</option>
                <option value="School Head">School Head / Principal</option>
                <option value="Super Admin">Super Administrator</option>
              </select>
            </div>

            {/* Account Status */}
            <div>
              <label htmlFor="user-status" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Approval Status <span className="text-crimson-600">*</span>
              </label>
              <select
                id="user-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                <option value="Approved">Approved (Immediate Active Access)</option>
                <option value="Pending">Pending (Quarantine Queue)</option>
              </select>
            </div>

            {/* Department */}
            <div className="sm:col-span-2">
              <label htmlFor="user-department" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Department / Office
              </label>
              <select
                id="user-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value="OTHER">Other (Specify Custom Department)</option>
              </select>
              {department ==="OTHER" && (
                <input
                  type="text"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  placeholder="Enter custom department name"
                  className="mt-2 w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                  required
                />
              )}
            </div>

            {/* Designation / Position */}
            <div className="sm:col-span-2">
              <label htmlFor="user-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Official Position / Designation
              </label>
              <select
                id="user-designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                {designationsList.map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
                <option value="OTHER">Other (Specify Custom Designation)</option>
              </select>
              {designation ==="OTHER" && (
                <input
                  type="text"
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="Enter custom position title"
                  className="mt-2 w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900"
                  required
                />
              )}
            </div>
          </div>

          {/* Non-teaching info alert */}
          {role ==="Non-Teaching" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span className="font-semibold block mb-0.5">Non-Teaching Role Clarification</span>
              This account will have access to administrative modules (Memos, Ancillary Document Vault, Leave Filing, School Calendar), while being exempt from instructional tasks (Lesson Logs, Timetables, Grading, COT Observations).
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-sand-700 hover:bg-sand-100 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-crimson-600 hover:bg-crimson-700 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ?"Registering..." :"Create Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
