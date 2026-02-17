"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"

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
        const formatted = String(h).padStart(2, "0") + ":00"
        hours.push(formatted)
      }
    })

    // Remove booked hours
    const booked =
      appointments?.map((a) => a.start_time.substring(0, 5)) || []

    hours = hours.filter((h) => !booked.includes(h))

    // Prevent booking within 2 hours (same day)
    const now = new Date()
    const selected = new Date(selectedDate)

    if (selected.toDateString() === now.toDateString()) {
      hours = hours.filter((hour) => {
        const hourNumber = parseInt(hour.split(":")[0])
        return hourNumber > now.getHours() + 1
      })
    }

    setAvailableHours(hours)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  async function bookHour(hour: string) {
    if (!user) return

    const nextHour =
      String(Number(hour.split(":")[0]) + 1).padStart(2, "0") +
      ":00:00"

    const { error } = await supabase
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

    if (error) {
      if (error.code === "23505") {
        alert("Dit uur is net geboekt.")
      } else {
        alert("Boeking mislukt.")
      }
      return
    }

    alert("Boeking bevestigd ✅")
    await loadAvailability()
  }

  if (!profile) return null

  if (profile.role === "coach") {
    return <CoachDashboard profile={profile} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1>Dashboard</h1>
          <button onClick={handleLogout} style={styles.logout}>
            Logout
          </button>
        </div>

        <p>
          Ingelogd als: <strong>{profile.email}</strong>
        </p>

        <h2>Boek een afspraak</h2>

        <select
          value={selectedCoach}
          onChange={(e) => setSelectedCoach(e.target.value)}
          style={styles.input}
        >
          <option value="">Selecteer coach</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name || coach.email}
            </option>
          ))}
        </select>

        <Calendar
          minDate={new Date()}
          onChange={(date: any) => {
            const d = new Date(date)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, "0")
            const day = String(d.getDate()).padStart(2, "0")
            const formatted = `${year}-${month}-${day}`
            setSelectedDate(formatted)
          }}
        />

        <h3>Beschikbare uren</h3>

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
      </div>
    </div>
  )
}

// ---------------- COACH DASHBOARD ----------------

function CoachDashboard({ profile }: any) {
  const [appointments, setAppointments] = useState<any[]>([])

  useEffect(() => {
    loadAppointments()
  }, [profile.id])

  async function loadAppointments() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    const formattedToday = `${year}-${month}-${day}`

    const { data } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        profiles:client_id ( email )
      `)
      .eq("coach_id", profile.id)
      .gte("appointment_date", formattedToday)

    setAppointments(data || [])
  }

  return (
    <div style={{ width: "100%", padding: 20 }}>
      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
        ]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        locale="nl"
        firstDay={1}
        timeZone="Europe/Brussels"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        height="85vh"
        expandRows={true}
        events={appointments.map((a) => ({
          title: a.profiles?.email,
          start: `${a.appointment_date}T${a.start_time}`,
          end: `${a.appointment_date}T${a.end_time}`,
        }))}
      />
    </div>
  )
}

// ---------------- STYLES ----------------

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
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logout: {
    background: "#111",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: 12,
    marginTop: 15,
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 15,
  },
  hourButton: {
    padding: 10,
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
}

