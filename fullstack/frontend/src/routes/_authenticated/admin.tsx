import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/settings",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Admin - GAMA FLOW",
      },
    ],
  }),
})

function AdminLayout() {
  return <Outlet />
}
