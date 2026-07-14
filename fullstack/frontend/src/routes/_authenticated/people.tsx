import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircle,
  Building2,
  Edit2,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/api/client"
import {
  type CustomerDirectoryItem,
  type EmployeeDirectoryItem,
  peopleApi,
} from "@/api/people"

export const Route = createFileRoute("/_authenticated/people")({
  component: People,
})

type PeopleTab = "employees" | "customers"

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || "NA"

const getEmployeeName = (employee: EmployeeDirectoryItem) =>
  employee.full_name?.trim() ||
  `${employee.first_name} ${employee.last_name}`.trim() ||
  employee.email?.split("@")[0] ||
  "Unnamed employee"

const getCustomerName = (customer: CustomerDirectoryItem) =>
  customer.contact_name?.trim() ||
  customer.email?.split("@")[0] ||
  "Unnamed customer"

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString()
}

function People() {
  const [activeTab, setActiveTab] = useState<PeopleTab>("employees")
  const [searchTerm, setSearchTerm] = useState("")

  const employeesQuery = useQuery({
    queryKey: ["people", "employees"],
    queryFn: peopleApi.getEmployees,
  })

  const customersQuery = useQuery({
    queryKey: ["people", "customers"],
    queryFn: peopleApi.getCustomers,
  })

  const employees = employeesQuery.data?.data ?? []
  const customers = customersQuery.data?.data ?? []

  const filteredEmployees = employees.filter((employee) => {
    const query = searchTerm.toLowerCase()
    const searchableValues = [
      getEmployeeName(employee),
      employee.email ?? "",
      employee.phone ?? "",
      employee.role_name ?? "",
      employee.role_title ?? "",
    ]
    return searchableValues.some((value) => value.toLowerCase().includes(query))
  })

  const filteredCustomers = customers.filter((customer) => {
    const query = searchTerm.toLowerCase()
    const searchableValues = [
      getCustomerName(customer),
      customer.email ?? "",
      customer.current_status ?? "",
      customer.remarks ?? "",
    ]
    return searchableValues.some((value) => value.toLowerCase().includes(query))
  })

  const isActiveTabLoading =
    activeTab === "employees"
      ? employeesQuery.isLoading
      : customersQuery.isLoading
  const activeTabError =
    activeTab === "employees" ? employeesQuery.error : customersQuery.error
  const filteredCount =
    activeTab === "employees"
      ? filteredEmployees.length
      : filteredCustomers.length
  const activeEmployeesCount = employees.filter(
    (employee) => employee.is_active,
  ).length
  const customersWithStatusCount = customers.filter((customer) =>
    customer.current_status?.trim(),
  ).length

  const handleUnavailableAction = (action: "add" | "edit" | "delete") => {
    const label = activeTab === "employees" ? "employee" : "customer"

    if (action === "add") {
      toast.info(`Add ${label} is not wired yet`)
      return
    }

    if (action === "edit") {
      toast.info(`Edit ${label} is not wired yet`)
      return
    }

    toast.info(`Delete ${label} is not wired yet`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            People
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse all employees and customers
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleUnavailableAction("add")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add {activeTab === "employees" ? "Employee" : "Customer"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Employees
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {employees.length}
              </p>
              <p className="text-sm text-green-600 mt-2">
                {activeEmployeesCount} active
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Customers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {customers.length}
              </p>
              <p className="text-sm text-green-600 mt-2">
                {customersWithStatusCount} with status
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8 px-6">
            <button
              type="button"
              onClick={() => setActiveTab("employees")}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === "employees"
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Employees ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === "customers"
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Customers ({customers.length})
            </button>
          </nav>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isActiveTabLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-500 dark:text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading {activeTab}...</span>
            </div>
          ) : activeTabError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <AlertCircle size={32} className="text-red-500" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Failed to load {activeTab}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getApiErrorMessage(activeTabError)}
                </p>
              </div>
            </div>
          ) : activeTab === "employees" ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => {
                  const employeeName = getEmployeeName(employee)
                  const employeeRole =
                    employee.role_name?.trim() ||
                    employee.role_title?.trim() ||
                    "Unassigned"

                  return (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(employeeName)}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {employeeName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {employeeRole}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {employee.role_title?.trim() || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Mail size={12} />
                            {employee.email ? (
                              <a
                                href={`mailto:${employee.email}`}
                                className="hover:text-blue-600"
                              >
                                {employee.email}
                              </a>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Phone size={12} />
                            <span>{employee.phone?.trim() || "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            employee.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {employee.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleUnavailableAction("edit")}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnavailableAction("delete")}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Current Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer) => {
                  const customerName = getCustomerName(customer)
                  const customerStatus =
                    customer.current_status?.trim() || "Unknown"

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(customerName)}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {customerName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {customerStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {customer.remarks?.trim() || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Mail size={12} />
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                className="hover:text-blue-600"
                              >
                                {customer.email}
                              </a>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(customer.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleUnavailableAction("edit")}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnavailableAction("delete")}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {filteredCount === 0 && !isActiveTabLoading && !activeTabError && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {activeTab} found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
