import { createFileRoute } from "@tanstack/react-router"
import { Settings } from "./settings"
export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: Settings,
})
