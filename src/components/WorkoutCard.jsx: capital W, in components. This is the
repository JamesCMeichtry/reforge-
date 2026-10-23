import { useEffect, useState } from 'react'
import { buttonPrimary, buttonSecondary } from './ui.jsx'
import { Sheet } from './LiveParts.jsx'
import { toast } from './Feedback.jsx'
import { cardRows, drawWorkoutCard, shareCard } from '../lib/workoutCard.js'

const today = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

function CardSheet({ day, logged, previous, stats, partner, onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [failed, setFailed] = useState(false)

  // The picture is made as the sheet opens, so tapping Share opens the phone's share sheet straight away
  useEffect(() => {
    let url = null
    drawWorkoutCard({
      title: day.name,
      focus: day.focus,
      date: today(),
      stats,
      rows: cardRows(day, logged, previous),
      partner,
      site: window.location.host,
    })
      .then((made) => {
        url = URL.createObjectURL(made)
        setFile(made)
        setPreview(url)
      })
      .catch(() => setFailed(true))
    return () => url && URL.revokeObjectURL(url)
  }, [day, logged, previous, stats, partner])

  async function share() {
    const result = await shareCard(file)
    if (result === 'saved') toast('Workout card saved')
    if (result === 'shared') onClose()
  }

  return (
    <Sheet title="Share your workout" onClose={onClose}>
      {failed ? (
        <p className="text-sm text-red-400">Couldn't make the picture on this phone.</p>
      ) : preview ? (
        <img
          src={preview}
          alt={`Workout card for ${day.name}`}
          className="mx-auto w-full max-w-xs rounded-2xl border border-line"
        />
      ) : (
        <div
          className="skeleton mx-auto aspect-[4/5] w-full max-w-xs rounded-2xl bg-ink"
          role="status"
          aria-label="Making your card"
        />
      )}
      <p className="mt-3 text-center text-xs text-muted">Only your training is on it. Injuries and pain never are.</p>
      <button type="button" onClick={share} disabled={!file} className={`mt-4 h-14 w-full text-lg ${buttonPrimary}`}>
        Share
      </button>
    </Sheet>
  )
}

// Session done: make a picture of the workout to post or send
export function ShareWorkout(props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`mt-4 w-full ${buttonSecondary}`}>
        Share workout card
      </button>
      {open && <CardSheet {...props} onClose={() => setOpen(false)} />}
    </>
  )
}
