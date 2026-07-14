import { useRouterState } from "@tanstack/react-router"
import {
  Home,
  FolderKanban,
  CheckSquare,
  Bot,
  Settings,
  Users,
  BarChart2,
  Wrench,
  Briefcase
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: FolderKanban, title: "Projects", path: "/projects" },
  { icon: CheckSquare, title: "Task Board", path: "/tasks" },
  { icon: Users, title: "People", path: "/people" },
  { icon: Wrench, title: "Subcontractors", path: "/subcontractors" },
  { icon: Bot, title: "AI Assistant", path: "/ai-assistant" },
  { icon: BarChart2, title: "Analytics", path: "/analytics" },
  { icon: Settings, title: "Settings", path: "/settings" },
]

const adminItems: Item[] = [
  { icon: Briefcase, title: "Projects", path: "/admin" },
  { icon: Users, title: "People", path: "/admin/people" },
  { icon: Settings, title: "Setting", path: "/admin/settings" },

]

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdminSection = pathname.startsWith("/admin")
  const items = isAdminSection ? adminItems : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        {/* GAMA Branding */}
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 overflow-hidden bg-white">
            <img
              src="/gama-logo.png"
              alt="GAMA Consulting"
              className="w-full h-full object-contain p-0.5"
            />
        </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">GAMA Consulting</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Project Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar