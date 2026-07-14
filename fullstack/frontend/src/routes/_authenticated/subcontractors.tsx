import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Plus,
  Search,
  Building2,
  Mail,
  X,
  Send,
  Edit2,
  Trash2,
  LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { subcontractorsApi } from '@/api/subcontractors'
import { materialsApi } from '@/api/materials'
import { Project, projectsApi } from '@/api/project'
import { set } from 'zod'

export const Route = createFileRoute('/_authenticated/subcontractors')({
  component: Subcontractors,
})

// ----- Data types -----

type ServiceType = 'Survey' | 'Soil Testing' | 'Timber Framing' | 'Other'
type OrderStatus = 'N/A' | 'Ordered' | 'Received' | 'By Client'

interface Subcontractor {
  id: string
  name: string
  email: string
  phone: string
  services: ServiceType[]
}

interface Order {
  id: string
  subcontractorId: string
  service: ServiceType
  projectId: string
  orderedDate: string
  status: OrderStatus
}


const mapStringToServiceType = (service: string): ServiceType => {
  switch (service.toLowerCase()) {
    case 'survey':
      return 'Survey'
    case 'soil testing':
      return 'Soil Testing'
    case 'timber framing':
      return 'Timber Framing'
    default:
      return 'Other'
  }
}

const mapMaterialStatus = (status: string | null | undefined): OrderStatus => {
  if (!status) return 'N/A'
  switch (status.toLowerCase()) {
    case 'ordered':
      return 'Ordered'
    case 'received':
      return 'Received'
    case 'by client':
    case 'by_client':
      return 'By Client'
    default:
      return 'N/A'
  }
}

const mapStatus = (status: OrderStatus) => {
  switch (status) {
    case 'Ordered':
      return 'ordered'
    case 'Received':
      return 'received'
    case 'By Client':
      return 'by_client'
    default:
      return 'N/A'
  }
}


const getServicePillClass = (service: string) =>
  SERVICE_TYPES.includes(service as ServiceType)
    ? servicePillClass[service as ServiceType]
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'

// ----- Mock data -----

const initialSubcontractors: Subcontractor[] = [
  { id: 'sc1', name: 'Big Wood Suppliers', email: 'orders@bigwood.com', phone: '+1 (555) 100-2001', services: ['Timber Framing'] },
  { id: 'sc2', name: 'GeoCon Labs', email: 'contact@geoconlabs.com', phone: '+1 (555) 100-2002', services: ['Soil Testing'] },
  { id: 'sc3', name: 'ABC Surveyors', email: 'info@abcsurveyors.com', phone: '+1 (555) 100-2003', services: ['Survey'] },
  { id: 'sc4', name: 'Steel Supply Co', email: 'orders@steelsupply.com', phone: '+1 (555) 100-2004', services: ['Other'] },
  { id: 'sc5', name: 'TimberFrame Pro', email: 'sales@timberframepro.com', phone: '+1 (555) 100-2005', services: ['Timber Framing'] },
]

const today = new Date()
const daysAgo = (n: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// const initialOrders: Order[] = [
//   { id: 'o1', subcontractorId: 'sc1', service: 'Timber Framing', projectId: 'PRJ-2024-001', projectName: 'Downtown Office Complex', orderedDate: daysAgo(12), status: 'Ordered' },
//   { id: 'o2', subcontractorId: 'sc1', service: 'Timber Framing', projectId: 'PRJ-2024-002', projectName: 'Highway Bridge Restoration', orderedDate: daysAgo(3), status: 'Ordered' },
//   { id: 'o3', subcontractorId: 'sc1', service: 'Timber Framing', projectId: 'PRJ-2023-012', projectName: 'Residential Tower Foundation', orderedDate: daysAgo(28), status: 'Ordered' },
//   { id: 'o4', subcontractorId: 'sc2', service: 'Soil Testing', projectId: 'PRJ-2024-001', projectName: 'Downtown Office Complex', orderedDate: daysAgo(2), status: 'Received' },
//   { id: 'o5', subcontractorId: 'sc2', service: 'Soil Testing', projectId: 'PRJ-2024-002', projectName: 'Highway Bridge Restoration', orderedDate: daysAgo(35), status: 'Ordered' },
//   { id: 'o6', subcontractorId: 'sc3', service: 'Survey', projectId: 'PRJ-2024-003', projectName: 'Bridge Renovation Project', orderedDate: daysAgo(5), status: 'By Client' },
//   { id: 'o7', subcontractorId: 'sc5', service: 'Timber Framing', projectId: 'PRJ-2024-004', projectName: 'Shopping Mall Expansion', orderedDate: daysAgo(9), status: 'Ordered' },
// ]

const PROJECT_OPTIONS = [
  { id: 'PRJ-2024-001', name: 'Downtown Office Complex' },
  { id: 'PRJ-2024-002', name: 'Highway Bridge Restoration' },
  { id: 'PRJ-2024-003', name: 'Bridge Renovation Project' },
  { id: 'PRJ-2024-004', name: 'Shopping Mall Expansion' },
  { id: 'PRJ-2023-012', name: 'Residential Tower Foundation' },
]

const SERVICE_TYPES: ServiceType[] = ['Survey', 'Soil Testing', 'Timber Framing', 'Other']

// ----- Helpers -----

const daysBetween = (dateStr: string) => {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

const getOrderAlert = (order: Order): { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' } => {
  if (order.status === 'Received') return { label: '✓ Done', tone: 'green' }
  if (order.status === 'By Client') return { label: '✓ N/A', tone: 'green' }
  if (order.status === 'N/A') return { label: '—', tone: 'gray' }
  const days = daysBetween(order.orderedDate)
  if (days >= 30) return { label: '🚨 >30d follow-up', tone: 'red' }
  if (days >= 21) return { label: '🚨 >21d follow-up', tone: 'red' }
  if (days >= 7) return { label: '⏰ >7d', tone: 'yellow' }
  return { label: '✓ On track', tone: 'green' }
}

const alertToneClass = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const statusPillClass: Record<OrderStatus, string> = {
  'N/A': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'Ordered': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Received': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'By Client': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}



const servicePillClass: Record<ServiceType, string> = {
  'Survey': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Soil Testing': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Timber Framing': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
}

const avatarColorFromName = (name: string) => {
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-orange-600', 'bg-teal-600', 'bg-pink-600', 'bg-green-600', 'bg-indigo-600']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

const formatDaysAgo = (dateStr: string) => {
  if (!dateStr) return '—'
  const d = daysBetween(dateStr)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

// ----- Grid column definitions (kept identical between header + row) -----

const ROW_COLS_BY_SC = 'grid-cols-[1.4fr_1.1fr_1fr_1fr_1.1fr_36px]'
const ROW_COLS_BY_SVC = 'grid-cols-[1.2fr_1.4fr_1.1fr_1fr_1fr_1.1fr_36px]'

// ----- New Order Modal -----

function NewOrderModal({
  projects,
  subcontractor,
  onClose,
  onSave,
}: {
  projects: Project[]
  subcontractor: Subcontractor
  onClose: () => void
  onSave: (order: Omit<Order, 'projectName'>) => void
}) {
  const [formData, setFormData] = useState({
    service: subcontractor.services[0] as ServiceType,
    projectId: projects?.[0]?.project_id,
    orderedDate: new Date().toISOString().split('T')[0],
    status: 'Ordered' as OrderStatus,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: formData.projectId,
      subcontractorId: subcontractor.id,
      service: formData.service,
      projectId: formData.projectId,
      orderedDate: formData.orderedDate,
      status: formData.status,
    })

    // send order to backend 
      
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Order</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">For {subcontractor.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
            <select
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value as ServiceType })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>{p.job_number} — {p.project_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordered Date</label>
            <input
              type="date"
              value={formData.orderedDate}
              onChange={(e) => setFormData({ ...formData, orderedDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as OrderStatus })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="N/A">N/A</option>
              <option value="Ordered">Ordered</option>
              <option value="Received">Received</option>
              <option value="By Client">By Client</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Create Order
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ----- Add Subcontractor Modal -----

function AddSubcontractorModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (sc: Omit<Subcontractor, 'id'>) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    services: [] as ServiceType[],
  })

  const toggleService = (s: ServiceType) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x) => x !== s)
        : [...prev.services, s],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in name and email')
      return
    }
    if (formData.services.length === 0) {
      toast.error('Pick at least one service')
      return
    }
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Subcontractor</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Big Wood Suppliers"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@example.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Services Provided</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleService(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    formData.services.includes(s)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Add Subcontractor
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ----- Order Row Component -----

function OrderRow({
  order,
  showSubcontractor = false,
  subcontractorName = '',
  onDelete,
}: {
  order: Order
  showSubcontractor?: boolean
  subcontractorName?: string
  onDelete: () => void
}) {
  const navigate = useNavigate();
  const alert = getOrderAlert(order)
  const cols = showSubcontractor ? ROW_COLS_BY_SVC : ROW_COLS_BY_SC

  const handleRowClick = () => {
    navigate({ to: `/projects/${order.projectId}` });
  }


  return (
    <div 
      onClick={handleRowClick}
      className={`grid ${cols} gap-2 px-4 py-2 items-center text-xs border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors`}
    >
      {showSubcontractor && (
        <span className="font-medium text-gray-900 dark:text-white truncate text-xs">{subcontractorName}</span>
      )}
      <span className="font-mono text-blue-700 dark:text-blue-400 text-[11px] truncate">{order.projectId}</span>
      <span className={`justify-self-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${getServicePillClass(order.service)}`}>
        {order.service}
      </span>
      <span className="justify-self-center text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDaysAgo(order.orderedDate)}</span>
      <span className={`justify-self-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${statusPillClass[mapMaterialStatus(order.status)]}`}>
        {order.status}
      </span>
      <span className={`justify-self-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${alertToneClass[alert.tone]}`}>
        {alert.label}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded justify-self-center"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ----- Main Component -----

function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [view, setView] = useState<'subcontractor' | 'service'>('subcontractor')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false)
  const [newOrderForSc, setNewOrderForSc] = useState<Subcontractor | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const totalActiveOrders = orders.length
  const followUpCount = orders.filter((o) => getOrderAlert(o).tone === 'red').length
  const overSevenDaysCount = orders.filter((o) => o.status === 'Ordered' && daysBetween(o.orderedDate) >= 7).length
  const [projects, setProjects] = useState<Project[]>([])


  // Fetch subcontractors on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsApi.getAllProjects();
        setProjects(data.data);
        // console.log('Raw projects data:', data)
      } catch (error) {
        toast.error('Failed to load projects')
        console.error(error)
      }
    }

    const fetchSubcontractors = async () => {
      try {
        setIsLoading(true)
        const data = await subcontractorsApi.getSubcontractors();
        // console.log('Raw subcontractors data:', data)

        const subcontractorsResult: Subcontractor[] = data.map((m: any) => ({
            id: m.id,
            name: m.company_name || '',
            email: m.contact_email || '',
            phone: m.phone || '',
            services: (m.specialty || '').split(',').map((s: string) => s.trim() as ServiceType).filter((s: ServiceType) => SERVICE_TYPES.includes(s)) || [],
          }))
        setSubcontractors(subcontractorsResult);
        // console.log('Fetched subcontractors:', subcontractorsResult)

      } catch (error) {
        toast.error('Failed to load subcontractors')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        const data = await materialsApi.getUnreceivedOrders()
        const ordersResult: Order[] = data.map((m: any) => ({
          id: m.id,
          projectName: m.project_name || '',
          projectId: m.project_id || '',
          subcontractorId: m.subcontractor_id || '',
          service: m.name || '',
          orderedDate: m.ordered_date || null,
          status: m.status || '',
        }))
        setOrders(ordersResult);

        // console.log('Fetched orders:', ordersResult)
      } catch (error) {
        toast.error('Failed to load orders')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
    fetchSubcontractors()
    fetchOrders()
  }, [])

  
  const matchSearch = (text: string) => text.toLowerCase().includes(searchTerm.toLowerCase())

  const handleAddSubcontractor = async (sc: Omit<Subcontractor, 'id'>) => {
    try {
      const apiPayload = {
        company_name: sc.name,
        contact_email: sc.email,
        phone: sc.phone,
        specialty: sc.services.join(', '),
      }
      const newSc = await subcontractorsApi.createSubcontractor(apiPayload)
      const frontendSc: Subcontractor = {
        id: newSc.id,
        name: newSc.company_name || '',
        email: newSc.contact_email || '',
        phone: newSc.phone || '',
        services: (newSc.specialty || '').split(',').map((s: string) => s.trim() as ServiceType).filter((s: ServiceType) => SERVICE_TYPES.includes(s)),
      }
      setSubcontractors([...subcontractors, frontendSc])
      toast.success(`${frontendSc.name} added`)
    } catch (error) {
      toast.error('Failed to add subcontractor')
      console.error(error)
    }
  }

  const handleAddOrder = async (order: Omit<Order, 'id'>) => {
    try {
      setIsLoading(true)
      const material = await materialsApi.createOrder(order.projectId, {
        project_id: order.projectId,
        name: order.service,
        status: mapStatus(order.status),
        subcontractor_id: order.subcontractorId,
        ordered_date: order.orderedDate,
      })

      const newOrder: Order = {
        id: material.id,
        subcontractorId: material.subcontractor_id ?? '',
        service: material.name as ServiceType,
        projectId: material.project_id,
        orderedDate: material.ordered_date ?? '',
        status: mapMaterialStatus(material.status),
      }

      // console.log('Created material:', material)

      setOrders((prev) => [...prev, newOrder])
      toast.success('Order created')
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteOrder = (id: string) => {
    setOrders(orders.filter((o) => o.id !== id))
    toast.success('Order removed')
  }

  const handleDeleteSubcontractor = (id: string) => {
    if (window.confirm('Remove this subcontractor and all their orders?')) {
      setSubcontractors(subcontractors.filter((s) => s.id !== id))
      setOrders(orders.filter((o) => o.subcontractorId !== id))
      toast.success('Subcontractor removed')
    }
  }

  const filteredSubcontractors = subcontractors.filter((sc) =>
    matchSearch(sc.name) || sc.services.some((s) => matchSearch(s)),
  )

  const ordersByService = SERVICE_TYPES.reduce((acc, service) => {
    acc[service] = orders.filter((o) => {
      const sc = subcontractors.find((s) => s.id === o.subcontractorId)
      const matches =
        matchSearch(o.projectId) ||
        (sc && matchSearch(sc.name)) ||
        matchSearch(o.service)
      return mapStringToServiceType(o.service) === service && matches
    })
    return acc
  }, {} as Record<ServiceType, Order[]>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subcontractors</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Cross-project order summary, grouped by subcontractor or service
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* LEFT SIDE PANEL */}
        <aside className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-fit lg:sticky lg:top-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">View By</h3>
            <div className="space-y-1">
              <button
                onClick={() => setView('subcontractor')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  view === 'subcontractor'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Building2 size={16} />
                <span className="flex-1">By Subcontractor</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  view === 'subcontractor' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {subcontractors.length}
                </span>
              </button>

              <button
                onClick={() => setView('service')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  view === 'service'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <LayoutGrid size={16} />
                <span className="flex-1">By Service</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  view === 'service' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {SERVICE_TYPES.length}
                </span>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total active orders</span>
                <span className="font-bold text-gray-900 dark:text-white">{totalActiveOrders}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Need follow-up</span>
                <span className="font-bold text-red-600">{followUpCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Ordered &gt;7 days</span>
                <span className="font-bold text-yellow-600">{overSevenDaysCount}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={() => setShowAddSubcontractor(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus size={16} />
              Add Subcontractor
            </button>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="space-y-4 min-w-0">
          {/* AI Coordination panel */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Send className="text-white" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">AI-Powered Coordination</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Day-based alerts following Harri's spec</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">{overSevenDaysCount}</div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">Over 7 days · daily reminder</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-lg font-bold text-red-600">{followUpCount}</div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">Follow-up needed (&gt;21d)</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-lg font-bold text-green-600">98%</div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">On-time completion</div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={view === 'subcontractor' ? 'Search subcontractors...' : 'Search orders by project or service...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          {/* VIEW: BY SUBCONTRACTOR */}
          {view === 'subcontractor' && (
            <div className="space-y-4">
              {filteredSubcontractors.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Building2 size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No subcontractors match your search</p>
                </div>
              ) : (
                filteredSubcontractors.map((sc) => {
                  const scOrders = orders.filter((o) => o.subcontractorId === sc.id)
                  return (
                    <div key={sc.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                        <div className={`w-10 h-10 ${avatarColorFromName(sc.name)} rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {initials(sc.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white">{sc.name}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                            <span>{sc.services.join(', ')}</span>
                            <span>·</span>
                            <span>{scOrders.length} {scOrders.length === 1 ? 'order' : 'orders'}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Mail size={11} /> {sc.email}</span>
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => toast.info('Edit subcontractor coming soon')}
                            className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubcontractor(sc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setNewOrderForSc(sc)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium whitespace-nowrap"
                          >
                            <Plus size={14} /> New Order
                          </button>
                        </div>
                      </div>

                      {scOrders.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                          No orders yet — click "New Order" to create one
                        </div>
                      ) : (
                        <>
                          {/* Header row — uses SAME grid as data row */}
                          <div className={`grid ${ROW_COLS_BY_SC} gap-2 px-4 py-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700`}>
                            <span>Project</span>
                            <span className="justify-self-center">Service</span>
                            <span className="justify-self-center">Ordered</span>
                            <span className="justify-self-center">Status</span>
                            <span className="justify-self-center">Alert</span>
                            <span></span>
                          </div>
                          {scOrders.map((order) => (
                            <OrderRow
                              key={order.id}
                              order={order}
                              onDelete={() => handleDeleteOrder(order.id)}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* VIEW: BY SERVICE */}
          {view === 'service' && (
            <div className="space-y-4">
              {SERVICE_TYPES.map((service) => {
                const svcOrders = ordersByService[service]
                return (
                  <div key={service} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${servicePillClass[service]}`}>
                        {service}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {svcOrders.length} {svcOrders.length === 1 ? 'order' : 'orders'} across projects
                      </span>
                    </div>

                    {svcOrders.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                        No active orders for {service.toLowerCase()}
                      </div>
                    ) : (
                      <>
                        <div className={`grid ${ROW_COLS_BY_SVC} gap-2 px-4 py-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700`}>
                          <span>Subcontractor</span>
                          <span>Project</span>
                          <span className="justify-self-center">Service</span>
                          <span className="justify-self-center">Ordered</span>
                          <span className="justify-self-center">Status</span>
                          <span className="justify-self-center">Alert</span>
                          <span></span>
                        </div>
                        {svcOrders.map((order) => {
                          const sc = subcontractors.find((s) => s.id === order.subcontractorId)
                          return (
                            <OrderRow
                              key={order.id}
                              order={order}
                              showSubcontractor
                              subcontractorName={sc?.name || 'Unknown'}
                              onDelete={() => handleDeleteOrder(order.id)}
                            />
                          )
                        })}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {showAddSubcontractor && (
        <AddSubcontractorModal
          onClose={() => setShowAddSubcontractor(false)}
          onSave={handleAddSubcontractor}
        />
      )}
      {newOrderForSc && (
        <NewOrderModal
          projects={projects}
          subcontractor={newOrderForSc}
          onClose={() => setNewOrderForSc(null)}
          onSave={handleAddOrder}
        />
      )}
    </div>
  )
}