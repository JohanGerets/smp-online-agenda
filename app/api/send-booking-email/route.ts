import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"

const resend = new Resend(process.env.RESEND_API_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      coachId,
      clientId,
      appointmentDate,
      startTime,
      manageToken,
    } = body

    const coachResponse = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", coachId)
      .single()

    const clientResponse = await supabase
      .from("profiles")
      .select("email")
      .eq("id", clientId)
      .single()

    const client = clientResponse.data
const coach = coachResponse.data as { email: string; name?: string }
const client = clientResponse.data as { email: string }

    if (!coach || !coach.email || !client || !client.email) {
      return NextResponse.json(
        { error: "Coach or client not found" },
        { status: 400 }
      )
    }

    const manageUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/manage/${manageToken}`

    await resend.emails.send({
      from: "SMP-Training <onboarding@resend.dev>",
      to: coach.email,
      subject: "Nieuwe boeking",
      html: `
        <h2>Nieuwe afspraak</h2>
        <p><strong>Klant:</strong> ${client.email}</p>
        <p><strong>Datum:</strong> ${appointmentDate}</p>
        <p><strong>Tijd:</strong> ${startTime}</p>
      `,
    })

    await resend.emails.send({
      from: "SMP-Training <onboarding@resend.dev>",
      to: client.email,
      subject: "Boeking bevestigd",
      html: `
        <h2>Je afspraak is bevestigd</h2>
        <p><strong>Coach:</strong> ${coach.name ?? "Coach"}</p>
        <p><strong>Datum:</strong> ${appointmentDate}</p>
        <p><strong>Tijd:</strong> ${startTime}</p>
        <br/>
        <p>Je kan aanpassen of annuleren tot 24u vooraf:</p>
        <a href="${manageUrl}">${manageUrl}</a>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("MAIL ERROR:", error)
    return NextResponse.json({ error: "Mail failed" }, { status: 500 })
  }
}

