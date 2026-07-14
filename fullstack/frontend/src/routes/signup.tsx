import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/signup")({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold">Signup Page</h1>
      <p>Coming soon...</p>
    </div>
  )
}