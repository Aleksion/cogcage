import { useState, type FormEvent } from 'react'

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&display=swap');
:root {
  --c-yellow: #FFD600; --c-orange: #FF9F1C; --c-red: #EB4D4B;
  --c-cyan: #00E5FF; --c-dark: #1A1A1A; --c-white: #FFFFFF;
  --f-display: 'Bangers', display; --f-body: 'Kanit', sans-serif;
  --radius: 14px; --shadow-hard: 6px 6px 0px rgba(0,0,0,0.2);
}
`

export function JoinSession({ code }: { code: string }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const name =
      (form.querySelector('#bot-name') as HTMLInputElement)?.value.trim() ||
      'Player'
    const systemPrompt = (
      form.querySelector('#bot-prompt') as HTMLTextAreaElement
    )?.value.trim()
    const loadout = [
      'MOVE',
      ...Array.from(
        form.querySelectorAll<HTMLInputElement>('.loadout-cb:checked'),
      ).map((el) => el.value),
    ]
    const armor =
      (
        form.querySelector<HTMLInputElement>(
          'input[name="armor"]:checked',
        )
      )?.value || 'medium'

    try {
      const res = await fetch('/api/sessions/join-by-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          bot: { name, systemPrompt, loadout, armor },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')
      window.location.href = `/play/session/${data.sessionId}?pid=${data.participantId}`
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 20% 20%, rgba(255,214,0,0.15), transparent 35%),
            radial-gradient(circle at 80% 0%, rgba(0,229,255,0.12), transparent 40%),
            linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)`,
          fontFamily: "var(--f-body, 'Kanit', sans-serif)",
          color: 'var(--c-dark, #1A1A1A)',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '3px solid #1A1A1A',
            borderRadius: '14px',
            boxShadow: '6px 6px 0px rgba(0,0,0,0.2)',
            padding: '2.5rem',
            maxWidth: 500,
            width: '100%',
          }}
        >
          <h1
            style={{
              fontFamily: "'Bangers', display",
              fontSize: '2rem',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}
          >
            Join FFA Tournament
          </h1>
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: '2.5rem',
              letterSpacing: 6,
              color: '#EB4D4B',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {code}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                  display: 'block',
                  marginBottom: '0.3rem',
                }}
              >
                Bot Name
              </label>
              <input
                id="bot-name"
                defaultValue="Iron Vanguard"
                required
                style={{
                  width: '100%',
                  border: '3px solid #1A1A1A',
                  borderRadius: 12,
                  padding: '0.6rem 0.8rem',
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: '0.95rem',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                  display: 'block',
                  marginBottom: '0.3rem',
                }}
              >
                System Prompt (Brain)
              </label>
              <textarea
                id="bot-prompt"
                defaultValue="You are an aggressive melee fighter. Prioritize closing distance and striking hard."
                style={{
                  width: '100%',
                  border: '3px solid #1A1A1A',
                  borderRadius: 12,
                  padding: '0.6rem 0.8rem',
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: '0.95rem',
                  minHeight: 80,
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                  display: 'block',
                  marginBottom: '0.3rem',
                }}
              >
                Loadout
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.3rem',
                  margin: '0.3rem 0',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" value="MOVE" checked disabled /> Move (4e)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" value="MELEE_STRIKE" defaultChecked className="loadout-cb" /> Melee (18e)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" value="RANGED_SHOT" className="loadout-cb" /> Ranged (14e)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" value="GUARD" defaultChecked className="loadout-cb" /> Guard (10e)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" value="DASH" defaultChecked className="loadout-cb" /> Dash (22e)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" value="UTILITY" className="loadout-cb" /> Utility (20e)
                </label>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                  display: 'block',
                  marginBottom: '0.3rem',
                }}
              >
                Armor
              </label>
              <div style={{ display: 'flex', gap: '1rem', margin: '0.3rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input type="radio" name="armor" value="light" /> Light
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input type="radio" name="armor" value="medium" defaultChecked /> Medium
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input type="radio" name="armor" value="heavy" /> Heavy
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                fontFamily: "'Bangers', display",
                fontSize: '1.3rem',
                textTransform: 'uppercase',
                padding: '0.9rem',
                background: '#EB4D4B',
                color: '#fff',
                border: '4px solid #1A1A1A',
                borderRadius: 999,
                boxShadow: '0 6px 0 #1A1A1A',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginTop: '1rem',
              }}
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
            {error && (
              <div
                style={{
                  color: '#EB4D4B',
                  fontWeight: 800,
                  marginTop: '0.5rem',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  )
}
