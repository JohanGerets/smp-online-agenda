"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [selectedCoach, setSelectedCoach] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [availableHours, setAvailableHours] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // ---------------- LOAD USER ----------------
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        window.location.href = "/"
        return
      }

      setUser(data.user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

      setProfile(profileData)
    }

    loadUser()
  }, [])

  // ---------------- LOAD COACHES ----------------
  useEffect(() => {
    async function loadCoaches() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "coach")

      setCoaches(data || [])
    }

    loadCoaches()
  }, [])

  // ---------------- LOAD AVAILABILITY ----------------
  useEffect(() => {
    if (!selectedCoach || !selectedDate) return
    loadAvailability()
  }, [selectedCoach, selectedDate])

  async function loadAvailability() {
    setLoading(true)

    const weekday = new Date(selectedDate).getDay()

    const { data: availability } = await supabase
      .from("coach_availability")
      .select("*")
      .eq("coach_id", selectedCoach)
      .eq("weekday", weekday)

    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time")
      .eq("coach_id", selectedCoach)
      .eq("appointment_date", selectedDate)

    let hours: string[] = []

    availability?.forEach((slot) => {
      const start = parseInt(slot.start_time.substring(0, 2))
      const end = parseInt(slot.end_time.substring(0, 2))

      for (let h = start; h < end; h++) {
        hours.push(String(h).padStart(2, "0") + ":00")
      }
    })

    const booked =
      appointments?.map((a) => a.start_time.substring(0, 5)) || []

    hours = hours.filter((h) => !booked.includes(h))

    setAvailableHours(hours)
    setLoading(false)
  }

  // ---------------- BOOK ----------------
  async function bookHour(hour: string) {
    if (!user) return

    const nextHour =
      String(Number(hour.split(":")[0]) + 1).padStart(2, "0") +
      ":00:00"

    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          coach_id: selectedCoach,
          client_id: user.id,
          appointment_date: selectedDate,
          start_time: hour + ":00",
          end_time: nextHour,
        },
      ])
      .select()
      .single()

    if (error) {
      alert("Boeking mislukt of uur net geboekt.")
      return
    }

    // 🔥 Mail trigger
    await fetch("/api/send-booking-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachId: selectedCoach,
        clientId: user.id,
        appointmentDate: selectedDate,
        startTime: hour,
        manageToken: data.manage_token,
      }),
    })

    alert("Boeking bevestigd ✅")
    await loadAvailability()
  }

  if (!profile) return null

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Boek een afspraak</h1>

        <select
          value={selectedCoach}
          onChange={(e) => setSelectedCoach(e.target.value)}
          style={styles.select}
        >
          <option value="">Selecteer coach</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name || coach.email}
            </option>
          ))}
        </select>

        {selectedCoach && (
          <>
            <Calendar
              minDate={new Date()}
              calendarType="iso8601"
              onChange={(date: any) => {
                const d = new Date(date)
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, "0")
                const day = String(d.getDate()).padStart(2, "0")
                setSelectedDate(`${year}-${month}-${day}`)
              }}
            />

            <h3 style={{ marginTop: 30 }}>Beschikbare uren</h3>

            {loading && <p>Loading...</p>}

            <div style={styles.grid}>
              {availableHours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => bookHour(hour)}
                  style={styles.hourButton}
                >
                  {hour}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles: any = {
  container: {
    minHeight: "100vh",
    background: "#f4f6f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  card: {
    background: "white",
    padding: 40,
    borderRadius: 16,
    width: 500,
    boxShadow: "0 15px 40px rgba(0,0,0,0.1)",
  },
  title: {
    marginBottom: 20,
  },
  select: {
    width: "100%",
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginTop: 10,
  },
  hourButton: {
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
}

