import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/api/client'
import { taskManagementApi, type Role } from '@/api/taskManagement'
import { workforceAllocationApi } from '@/api/workforceAllocation'
import { readUsersWithDetails } from '@/client/adminApi'

export const Route = createFileRoute('/_authenticated/projects/workforce/$projectId')({
  component: WorkforcePage,
})

type WorkerStatus = 'active' | 'completed' | 'available'

type ProjectWorker = {
  key: string
  userId: string | null
  name: string
  assignedRole: string
  roleId: string | null
  status: WorkerStatus
}

type DirectoryWorker = {
  userId: string
  name: string
  defaultRoleName: string
  defaultRoleId: string | null
  status: WorkerStatus
}

const AVATAR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#14b8a6', '#6366f1', '#22c55e', '#f43f5e',
]

const normalizeValue = (value?: string | null) => value?.trim().toLowerCase() || ''

const formatRoleLabel = (roleName?: string | null) => {
  if (!roleName) return 'Team Member'
  return roleName
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getStatusBadgeClass(status: WorkerStatus) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'available':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }
}

function AllocationModal({
  workers,
  employeeOptions,
  roles,
  saving,
  onClose,
  onSave,
}: {
  workers: ProjectWorker[]
  employeeOptions: DirectoryWorker[]
  roles: Role[]
  saving: boolean
  onClose: () => void
  onSave: (updated: ProjectWorker[]) => Promise<void>
}) {
  const [rows, setRows] = useState<ProjectWorker[]>(workers)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const assignedUserIds = useMemo(
    () => new Set(rows.map((row) => row.userId).filter((userId): userId is string => Boolean(userId))),
    [rows],
  )

  const availableEmployees = useMemo(
    () => employeeOptions.filter((employee) => !assignedUserIds.has(employee.userId)),
    [assignedUserIds, employeeOptions],
  )

  const handleAdd = () => {
    const selectedEmployee = availableEmployees.find((employee) => employee.userId === selectedUserId)
    const selectedRole = roles.find((role) => role.id === selectedRoleId)

    if (!selectedEmployee || !selectedRole) {
      toast.error('Please choose an employee and role')
      return
    }

    setRows((prev) => [
      ...prev,
      {
        key: selectedEmployee.userId,
        userId: selectedEmployee.userId,
        name: selectedEmployee.name,
        assignedRole: formatRoleLabel(selectedRole.role_name),
        roleId: selectedRole.id,
        status: 'active',
      },
    ])
    setSelectedUserId('')
    setSelectedRoleId('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-7 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Workforce Allocation</h2>
          <p className="text-sm text-gray-500 mt-0.5">Add or remove team members for this project</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 px-7 pb-4">
          <select
            value={selectedUserId}
            onChange={(event) => {
              const nextUserId = event.target.value
              const selectedEmployee = availableEmployees.find((employee) => employee.userId === nextUserId)
              setSelectedUserId(nextUserId)
              setSelectedRoleId(selectedEmployee?.defaultRoleId || '')
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Employee</option>
            {availableEmployees.map((employee) => (
              <option key={employee.userId} value={employee.userId}>
                {employee.name}
              </option>
            ))}
          </select>
          <select
            value={selectedRoleId}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {formatRoleLabel(role.role_name)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            Add
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 overflow-y-auto flex-1">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-7 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-7 py-6 text-sm text-center text-gray-400">
                    No team members assigned yet
                  </td>
                </tr>
              ) : (
                rows.map((worker) => (
                  <tr key={worker.key} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-7 py-3 text-sm text-gray-800 dark:text-gray-200">{worker.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{worker.assignedRole}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((row) => row.key !== worker.key))}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none"
                        disabled={saving}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 px-7 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(rows)}
            className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkforcePage() {
  const { projectId } = Route.useParams()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [directoryWorkers, setDirectoryWorkers] = useState<DirectoryWorker[]>([])
  const [workforce, setWorkforce] = useState<ProjectWorker[]>([])
  const [initialWorkforce, setInitialWorkforce] = useState<ProjectWorker[]>([])

  const loadWorkforce = useCallback(async () => {
    setLoading(true)
    try {
      const [workforceData, users, rolesResponse] = await Promise.all([
        workforceAllocationApi.getWorkforceAllocations(projectId),
        readUsersWithDetails(),
        taskManagementApi.getRoles(),
      ])

      const nextRoles = rolesResponse.data.filter((role) => role.is_active)

      const directory = users.map((user: any, index: number) => {
        const name = user.full_name?.trim() || user.email?.split('@')[0] || `User ${index + 1}`
        return {
          userId: user.id,
          name,
          defaultRoleName: 'team_member',
          defaultRoleId: null,
          status: user.is_active ? 'active' : 'available',
        } satisfies DirectoryWorker
      })

      const directoryByName = new Map(directory.map((entry) => [normalizeValue(entry.name), entry]))

      const assignedWorkers = workforceData.assignments.map((assignment, index) => {
        const matchedUser = directoryByName.get(normalizeValue(assignment.employee_name))

        return {
          key: matchedUser?.userId ?? `assignment-${index}`,
          userId: matchedUser?.userId ?? null,
          name: assignment.employee_name?.trim() || matchedUser?.name || `User ${index + 1}`,
          assignedRole: formatRoleLabel(assignment.role_name),
          roleId: assignment.role_id,
          status: matchedUser?.status ?? 'active',
        } satisfies ProjectWorker
      })

      setRoles(nextRoles)
      setDirectoryWorkers(directory)
      setWorkforce(assignedWorkers)
      setInitialWorkforce(assignedWorkers)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
      setRoles([])
      setDirectoryWorkers([])
      setWorkforce([])
      setInitialWorkforce([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadWorkforce()
  }, [loadWorkforce])

  const persistWorkforceChanges = async (updatedRows: ProjectWorker[]) => {
    const additions = updatedRows.filter(
      (worker) => worker.userId && worker.roleId && !initialWorkforce.some((initial) => initial.userId === worker.userId),
    )

    const removals = initialWorkforce.filter(
      (worker) => worker.userId && !updatedRows.some((updated) => updated.userId === worker.userId),
    )

    if (additions.length === 0 && removals.length === 0) {
      setShowModal(false)
      toast.success('No workforce changes to save')
      return
    }

    setSaving(true)
    try {
      if (additions.length > 0) {
        await workforceAllocationApi.assignWorkforce(
          projectId,
          additions.map((worker) => ({
            user_id: worker.userId as string,
            role_id: worker.roleId as string,
          })),
        )
      }

      if (removals.length > 0) {
        await workforceAllocationApi.removeWorkforce(projectId, {
          user_ids: removals.map((worker) => worker.userId as string),
        })
      }

      await loadWorkforce()
      setShowModal(false)
      toast.success('Workforce updated successfully')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveWorker = async (worker: ProjectWorker) => {
    if (!worker.userId) {
      toast.error('This assignment cannot be removed because it is not linked to a user record')
      return
    }

    setRemovingUserId(worker.userId)
    try {
      await workforceAllocationApi.removeWorkforce(projectId, {
        user_ids: [worker.userId],
      })
      await loadWorkforce()
      toast.success('Team member removed')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setRemovingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/projects/$projectId"
        params={{ projectId }}
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Project
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="text-blue-600" size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workforce Allocation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{workforce.length} team members assigned</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={loading || saving}
        >
          + Add Member
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 size={20} className="mx-auto mb-3 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading workforce data...</p>
          </div>
        ) : workforce.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No workforce data available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {workforce.map((worker) => (
              <div key={worker.key} className="flex items-center gap-4 px-6 py-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: avatarColor(worker.name) }}
                >
                  {getInitials(worker.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{worker.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{worker.assignedRole}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(worker.status)}`}>
                  {worker.status}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRemoveWorker(worker)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none ml-2 disabled:opacity-50"
                  disabled={saving || removingUserId === worker.userId || !worker.userId}
                  title={!worker.userId ? 'This assignment cannot be removed because it is not linked to a user record' : 'Remove member'}
                >
                  {removingUserId === worker.userId ? <Loader2 size={14} className="animate-spin" /> : 'x'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AllocationModal
          workers={workforce}
          employeeOptions={directoryWorkers}
          roles={roles}
          saving={saving}
          onClose={() => setShowModal(false)}
          onSave={persistWorkforceChanges}
        />
      )}
    </div>
  )
}
