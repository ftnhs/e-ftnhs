import React, { useState, useEffect } from"react";
import { schoolReferenceService } from"../../services/schoolReferenceService";
import type { Profile, UserRole, UserStatus } from"../../types";
import { X, Edit3, Eye, EyeOff, AlertCircle } from"lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  user: Profile | null;
  onClose: () => void;
  onUserUpdated: () => void;
  onUpdate: (
    userId: string,
    payload: {
      email?: string;
      full_name?: string;
      role?: UserRole;
      department?: string | null;
      designation?: string | null;
      status?: UserStatus;
      password?: string;
    }
  ) => Promise<void>;
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

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onUserUpdated,
  onUpdate,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("Teacher");
  const [department, setDepartment] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(COMMON_DEPARTMENTS);
  const [designation, setDesignation] = useState("");
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

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ||"");
      setEmail(user.email ||"");
      setPassword("");
      setRole(user.role ||"Teacher");
      setStatus(user.status ||"Approved");

      const currentDept = user.department ||"";
      if (departmentOptions.includes(currentDept) || COMMON_DEPARTMENTS.includes(currentDept)) {
        setDepartment(currentDept);
        setCustomDepartment("");
      } else if (currentDept) {
        setDepartment("OTHER");
        setCustomDepartment(currentDept);
      } else {
        setDepartment(role ==="Non-Teaching" ?"Administrative & Personnel Services" :"Junior High School (JHS)");
      }

      const allDesigs = [...TEACHING_DESIGNATIONS, ...NON_TEACHING_DESIGNATIONS, ...ADMIN_DESIGNATIONS];
      const currentDesig = user.designation ||"";
      if (allDesigs.includes(currentDesig)) {
        setDesignation(currentDesig);
        setCustomDesignation("");
      } else if (currentDesig) {
        setDesignation("OTHER");
        setCustomDesignation(currentDesig);
      } else {
        setDesignation(role ==="Non-Teaching" ?"Administrative Officer II (AO II)" :"Teacher I");
      }
    }
  }, [user, role, departmentOptions]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMsg("Full name and email address cannot be empty.");
      return;
    }

    const finalDepartment = department ==="OTHER" ? customDepartment.trim() : department;
    const finalDesignation = designation ==="OTHER" ? customDesignation.trim() : designation;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onUpdate(user.id, {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        department: finalDepartment,
        designation: finalDesignation,
        status,
        password: password.trim() || undefined,
      });
      onUserUpdated();
      onClose();
    } catch (err: unknown) {
      console.error("[EditUserModal] Error:", err);
      setErrorMsg(err instanceof Error ? err.message :"Failed to update profile.");
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
      aria-labelledby="edit-user-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyprus-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white border border-sand-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-sand-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyprus-900 text-deped-gold-400 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-user-title" className="text-base font-bold text-cyprus-900">
                Modify Personnel Profile
              </h2>
              <p className="text-xs text-sand-600">
                Update roles, department, designation, and credentials.
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
              <label htmlFor="edit-user-fullname" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Full Name <span className="text-crimson-600">*</span>
              </label>
              <input
                id="edit-user-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              />
            </div>

            {/* Email Address */}
            <div className="sm:col-span-2">
              <label htmlFor="edit-user-email" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Official Email Address <span className="text-crimson-600">*</span>
              </label>
              <input
                id="edit-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600 font-mono"
              />
            </div>

            {/* Reset Password (Optional) */}
            <div className="sm:col-span-2">
              <label htmlFor="edit-user-password" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Reset Password (Optional)
              </label>
              <div className="relative">
                <input
                  id="edit-user-password"
                  type={showPassword ?"text" :"password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to retain current password"
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
            </div>

            {/* System Role */}
            <div>
              <label htmlFor="edit-user-role" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Institutional Role <span className="text-crimson-600">*</span>
              </label>
              <select
                id="edit-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
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
              <label htmlFor="edit-user-status" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Approval Status <span className="text-crimson-600">*</span>
              </label>
              <select
                id="edit-user-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full py-2 px-3 rounded-lg border border-sand-300 bg-white text-sm font-medium text-cyprus-900 focus-visible:ring-2 focus-visible:ring-crimson-600"
              >
                <option value="Approved">Approved (Active Access)</option>
                <option value="Pending">Pending (Quarantine Queue)</option>
                <option value="Rejected">Rejected (Revoked Access)</option>
              </select>
            </div>

            {/* Department */}
            <div className="sm:col-span-2">
              <label htmlFor="edit-user-department" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Department / Office
              </label>
              <select
                id="edit-user-department"
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
              <label htmlFor="edit-user-designation" className="block text-xs font-semibold text-cyprus-900 mb-1">
                Official Position / Designation
              </label>
              <select
                id="edit-user-designation"
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
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isSubmitting ?"Saving..." :"Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
