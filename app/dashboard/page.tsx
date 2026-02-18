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
        const formatted = String(h).padStart(2, "0") + ":00"
        hours.push(formatted)
      }
    })

    const booked =
      appointments?.map((a) => a.start_time.substring(0, 5)) || []

    hours = hours.filter((h) => !booked.includes(h))

    setAvailableHours(hours)
    setLoading(false)
  }

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
      if (error.code === "23505") {
        alert("Dit uur is net geboekt.")
      } else {
        alert("Boeking mislukt.")
      }
      return
    }

    // 🔥 MAIL TRIGGER
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-booking-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachEmail: "johangerets@hotmail.com", // tijdelijk hardcoded
          clientEmail: profile.email,
          appointmentDate: selectedDate,
          startTime: hour,
          manageUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/manage/${data.manage_token}`,
        }),
      }
    )

    alert("Boeking bevestigd ✅")
    await loadAvailability()
  }

  if (!profile) return null

  return (
    <div style={{ padding: 40 }}>
      <h1>Boek een afspraak</h1>

      <select
        value={selectedCoach}
        onChange={(e) => setSelectedCoach(e.target.value)}
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
          setSelectedDate(`${year}-${month}-${day}`)
        }}
      />

      <h3>Beschikbare uren</h3>

      {loading && <p>Loading...</p>}

      <div>
        {availableHours.map((hour) => (
          <button key={hour} onClick={() => bookHour(hour)}>
            {hour}
          </button>
        ))}
      </div>
    </div>
  )
}

