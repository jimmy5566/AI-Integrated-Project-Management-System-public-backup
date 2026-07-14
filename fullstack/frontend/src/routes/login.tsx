import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import useAuth from "@/hooks/useAuth"
import "./login.css"

export const Route = createFileRoute("/login")({
  component: Login,
})

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { loginMutation } = useAuth()

  const handleLogin = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    loginMutation.mutate({ username: email, password })
  }

  return (
    <div className="login-container">

      {/* LEFT SIDE */}
      <div className="login-left">
        <div className="top-left-text">
          <h1>GamaFlow</h1>
          <p>AI project management intelligence platform</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">
        <div className="login-box">
          <h2>Welcome Back!</h2>
          <p className="subtitle">Sign in to continue</p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <a href="/recover-password" className="forgot">
              Forgot your password?
            </a>

            <button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "SIGNING IN..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}