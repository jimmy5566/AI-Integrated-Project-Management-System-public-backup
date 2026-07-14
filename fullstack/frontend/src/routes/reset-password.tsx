import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold">Reset Password Page</h1>
    </div>
  )
}