"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      window.location.href = "/dashboard"
    }
  }

  async function handleRegister() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      alert("Check je email 📩")
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={{ marginBottom: 30 }}>Coaching Planner</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleLogin} style={styles.primary}>
          Login
        </button>

        <div style={{ height: 15 }} />

        <button onClick={handleRegister} style={styles.secondary}>
          Register
        </button>
      </div>
    </div>
  )
}

const styles: any = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#1f2937,#111827)",
  },
  card: {
    background: "white",
    padding: 50,
    borderRadius: 20,
    width: 400,
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  primary: {
    width: "100%",
    padding: 12,
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  secondary: {
    width: "100%",
    padding: 12,
    background: "#e5e7eb",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
}

