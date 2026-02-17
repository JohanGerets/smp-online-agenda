'use client'

import React, { useState, useEffect } from 'react'
import FullCalendar, { EventInput } from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Coach { id: string, name: string }
interface TrainingOption { id: string, name: string }

export default function AgendaPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<string>('')
  const [trainings, setTrainings] = useState<TrainingOption[]>([])
  const [events, setEvents] = useState<EventInput[]>([])

  useEffect(() => {
    async function fetchData() {
      const { data: coachData } = await supabase.from('coaches').select('*')
      setCoaches(coachData || [])

      const { data: trainingData } = await supabase
        .from('trainings_options')
        .select('*')
        .order('sort_order', { ascending: true })
      setTrainings(trainingData || [])
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function fetchReservations() {
      if (!selectedCoach) return
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, reserved_at, training_id, training:training_id(name)')
        .eq('coach_id', selectedCoach)
      const mappedEvents = (reservations || []).map(r => ({
        id: r.id,
        title: r.training.name,
        start: r.reserved_at
      }))
      setEvents(mappedEvents)
    }
    fetchReservations()
  }, [selectedCoach])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Online Agenda</h1>

      {/* Coach Dropdown */}
      <label>Coach: </label>
      <select value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)}>
        <option value="">Select a coach</option>
        {coaches.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Training Dropdown */}
      <label style={{ marginLeft: '20px' }}>Training: </label>
      <select>
        {trainings.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <div style={{ marginTop: '20px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          events={events}
          selectable={true}
          eventClick={info => alert(`Training: ${info.event.title}`)}
        />
      </div>
    </div>
  )
}

