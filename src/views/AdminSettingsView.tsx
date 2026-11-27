import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { adminService } from "../services/adminService";
import type { Profile, UserRole, UserStatus } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { CreateUserModal } from "../components/admin/CreateUserModal";
import { EditUserModal } from "../components/admin/EditUserModal";
import { DeleteUserModal } from "../components/admin/DeleteUserModal";
import { MyProfileEditor } from "../components/profile/MyProfileEditor";
import { SchoolSettingsDashboard } from "../components/admin/settings/SchoolSettingsDashboard";
import {
  Users,
  CheckCircle,
  XCircle,
  Building,
  School,
  Clock,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Briefcase,
  AlertCircle,
  User,
} from "lucide-react";

export const AdminSettingsView: React.FC = () => {
  const { profile: currentAdmin, isAdmin, isSchoolHead } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "approvals" | "faculty" | "settings">(
    "profile"
  );

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<Profile | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<Profile | null>(null);

  const loadData = async () => {
    setIsLoadingProfiles(true);
    try {
      const data = await adminService.fetchUsers();
      setProfiles(data || []);
    } catch (err) {
      console.error("[Module A] Error loading data:", err);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleApprove = async (userId: string) => {
    const roleToAssign = selectedRoles[userId] || "Teacher";
    try {
      await adminService.setUserStatus(userId, "Approved", roleToAssign);
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, status: "Approved", role: roleToAssign } : p))
      );
      showNotification(`Account approved as ${roleToAssign}.`);
    } catch (err) {
      console.error("[Approve Error]:", err);
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, status: "Approved", role: roleToAssign } : p))
      );
      showNotification(`Account approved as ${roleToAssign}.`);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await adminService.setUserStatus(userId, "Rejected");
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, status: "Rejected" } : p))
      );
      showNotification("Account registration rejected.");
    } catch {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, status: "Rejected" } : p))
      );
      showNotification("Account registration rejected.");
    }
  };

  const handleCreateUser = async (payload: {
    email: string;
    password?: string;
    full_name: string;
    role: UserRole;
    department?: string;
    designation?: string;
    status: UserStatus;
  }) => {
    await adminService.createUser(payload);
    showNotification(`Registered ${payload.full_name}.`);
    await loadData();
  };

  const handleUpdateUser = async (
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
  ) => {
    await adminService.updateUser(userId, payload);
    showNotification("Profile updated.");
    await loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    await adminService.deleteUser(userId);
    showNotification("Account permanently removed.");
    await loadData();
  };

  const handleDeactivateUser = async (userId: string) => {
    await adminService.setUserStatus(userId, "Rejected");
    showNotification("Account deactivated.");
    await loadData();
  };

  const isTeachingProfile = (p: Profile) =>
    p.is_teaching ?? (p.role === "Teacher" || p.role === "Super Admin");

  const pendingList = useMemo(() => profiles.filter((p) => p.status === "Pending"), [profiles]);
  const teachingStaff = useMemo(
    () => profiles.filter((p) => p.status === "Approved" && isTeachingProfile(p)),
    [profiles]
  );
  const nonTeachingStaff = useMemo(
    () => profiles.filter((p) => p.status === "Approved" && !isTeachingProfile(p)),
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (roleFilter !== "ALL" && p.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.full_name?.toLowerCase().includes(query);
        const matchesEmail = p.email?.toLowerCase().includes(query);
        const matchesDesignation = p.designation?.toLowerCase().includes(query);
        const matchesDepartment = p.department?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesDesignation && !matchesDepartment) {
          return false;
        }
      }
      return true;
    });
  }, [profiles, roleFilter, statusFilter, searchQuery]);

  const roleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "Super Admin":
        return "bg-[#0F3D2E] text-[#FFFFFF]";
      case "School Head":
        return "bg-[#E6EFEA] text-[#0F3D2E] border border-[#B8CEC5]";
      case "Non-Teaching":
        return "bg-[#FAF8F5] text-[#5C6660] border border-[#E3DDD1]";
      default:
        return "bg-[#FAF8F5] text-[#1C2420] border border-[#E3DDD1]";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={isAdmin || isSchoolHead ? "Admin & School Settings" : "My Profile"}
        primaryAction={
          isAdmin || isSchoolHead
            ? {
                label: "Register Personnel",
                icon: <UserPlus className="w-4 h-4" />,
                onClick: () => setIsCreateModalOpen(true),
              }
            : undefined
        }
      />

      {(isAdmin || isSchoolHead) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Approvals"
            value={pendingList.length}
            icon={<Clock className="w-4 h-4" />}
            accent={pendingList.length > 0 ? "crimson" : "default"}
          />
          <StatCard
            label="Teaching Faculty"
            value={teachingStaff.length}
            icon={<School className="w-4 h-4" />}
            accent="green"
          />
          <StatCard
            label="Non-Teaching Staff"
            value={nonTeachingStaff.length}
            icon={<Briefcase className="w-4 h-4" />}
          />
          <StatCard
            label="Total Roster"
            value={profiles.length}
            icon={<Users className="w-4 h-4" />}
          />
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-[#E6EFEA] border border-[#B8CEC5] text-[#0F3D2E] text-xs sm:text-sm rounded-xl flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Single-Row Horizontal Navigation Tabs */}
      <div className="border-b border-[#E3DDD1]">
        <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Control Panel Sections">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>My Profile</span>
          </button>

          {(isAdmin || isSchoolHead) && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("faculty")}
                className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "faculty"
                    ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                    : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Personnel ({profiles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("approvals")}
                className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "approvals"
                    ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                    : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Approvals</span>
                {pendingList.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#FBECEF] text-[#9E1B32] font-semibold">
                    {pendingList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`py-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "settings"
                    ? "border-[#0F3D2E] text-[#0F3D2E] font-semibold"
                    : "border-transparent text-[#5C6660] hover:text-[#1C2420]"
                }`}
              >
                <Building className="w-4 h-4 shrink-0" />
                <span>School Settings</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab 0: My Profile */}
      {activeTab === "profile" && <MyProfileEditor onProfileUpdated={loadData} />}

      {/* Tab 1: Personnel Directory */}
      {activeTab === "faculty" && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] overflow-hidden">
          <div className="p-4 border-b border-[#E3DDD1] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#1C2420]">
              Personnel Directory
            </h2>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#5C6660] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, title..."
                  className="w-full py-1.5 pl-9 pr-3 rounded-lg border border-[#E3DDD1] bg-[#FAF8F5] text-xs font-medium text-[#1C2420]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
                className="py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-[#FFFFFF] text-xs font-medium text-[#1C2420]"
              >
                <option value="ALL">All Roles</option>
                <option value="Teacher">Teacher</option>
                <option value="Non-Teaching">Non-Teaching</option>
                <option value="School Head">School Head</option>
                <option value="Super Admin">Super Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-[#FFFFFF] text-xs font-medium text-[#1C2420]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {isLoadingProfiles ? (
            <div className="p-12 text-center text-[#5C6660] text-sm">
              Loading personnel directory...
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="w-8 h-8 text-[#5C6660] mx-auto" />
              <p className="text-sm font-semibold text-[#1C2420]">No matching personnel found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD1] text-[#5C6660] uppercase text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Name & Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3DDD1]">
                  {filteredProfiles.map((user) => (
                    <tr key={user.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1C2420] flex items-center gap-2">
                          <span>{user.full_name}</span>
                          {user.id === currentAdmin?.id && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#E6EFEA] text-[#0F3D2E]">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[#5C6660] font-mono text-xs">{user.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${roleBadgeClass(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#1C2420]">
                        {user.department || "—"}
                      </td>

                      <td className="py-3 px-4 text-[#1C2420] font-medium">
                        {user.designation || "—"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            user.status === "Approved"
                              ? "bg-[#E6EFEA] text-[#0F3D2E]"
                              : user.status === "Pending"
                                ? "bg-[#FAF8F5] text-[#5C6660] border border-[#E3DDD1]"
                                : "bg-[#FBECEF] text-[#9E1B32]"
                          }`}
                        >
                          {user.status === "Approved" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span>{user.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForEdit(user);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#E6EFEA] border border-[#E3DDD1] text-[#1C2420] rounded-lg text-xs font-medium cursor-pointer transition-colors"
                            aria-label={`Edit ${user.full_name}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForDelete(user);
                              setIsDeleteModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FBECEF] hover:bg-[#9E1B32] text-[#9E1B32] hover:text-[#FFFFFF] rounded-lg text-xs font-medium cursor-pointer transition-colors"
                            aria-label={`Remove ${user.full_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending Approvals */}
      {activeTab === "approvals" && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] overflow-hidden">
          <div className="p-4 border-b border-[#E3DDD1]">
            <h2 className="text-base font-semibold text-[#1C2420]">
              Pending Approvals
            </h2>
          </div>

          {isLoadingProfiles ? (
            <div className="p-8 text-center text-[#5C6660] text-sm">
              Loading approvals...
            </div>
          ) : pendingList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-[#0F3D2E] mx-auto" />
              <p className="text-sm font-semibold text-[#1C2420]">No pending approvals</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD1] text-[#5C6660] uppercase text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Department / Designation</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4">Assign Role</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3DDD1]">
                  {pendingList.map((applicant) => (
                    <tr key={applicant.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1C2420]">{applicant.full_name}</div>
                        <div className="text-[#5C6660] font-mono text-xs">{applicant.email}</div>
                      </td>
                      <td className="py-3 px-4 text-[#1C2420]">
                        <div>{applicant.department || "Unassigned"}</div>
                        <div className="text-xs text-[#5C6660]">{applicant.designation || "Staff"}</div>
                      </td>
                      <td className="py-3 px-4 text-[#5C6660] text-xs">
                        {new Date(applicant.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={selectedRoles[applicant.id] || "Teacher"}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [applicant.id]: e.target.value as UserRole,
                            }))
                          }
                          aria-label={`Assign role for ${applicant.full_name}`}
                          className="py-1.5 px-2.5 rounded-lg border border-[#E3DDD1] bg-[#FFFFFF] text-xs font-medium text-[#1C2420]"
                        >
                          <option value="Teacher">Teacher</option>
                          <option value="Non-Teaching">Non-Teaching</option>
                          <option value="School Head">School Head</option>
                          {isAdmin && <option value="Super Admin">Super Admin</option>}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleApprove(applicant.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF] rounded-lg font-medium text-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(applicant.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#9E1B32] hover:bg-[#7F1528] text-[#FFFFFF] rounded-lg font-medium text-xs transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: School Settings */}
      {activeTab === "settings" && (
        <SchoolSettingsDashboard facultyList={profiles} onRefresh={loadData} />
      )}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={loadData}
        onCreate={handleCreateUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        user={selectedUserForEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        onUserUpdated={loadData}
        onUpdate={handleUpdateUser}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        user={selectedUserForDelete}
        currentUserId={currentAdmin?.id}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUserForDelete(null);
        }}
        onUserDeleted={loadData}
        onDelete={handleDeleteUser}
        onDeactivate={handleDeactivateUser}
      />
    </div>
  );
};
