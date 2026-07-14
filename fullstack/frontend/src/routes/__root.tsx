import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Outlet />
    </div>
  )
}