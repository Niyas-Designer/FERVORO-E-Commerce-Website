import { useId, useRef, useState } from 'react'
import { NEWSLETTER } from '../../data/footer'

// Pragmatic client-side check (the server, once approved, remains the source of truth).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(value) {
  const email = value.trim()
  if (!email) return 'Please enter your email address.'
  if (email.length > 254 || !EMAIL_RE.test(email)) return 'Please enter a valid email address.'
  return ''
}

/**
 * Newsletter sign-up – PREVIEW STATE. There is no newsletter API and no approved data-handling approach yet,
 * so a valid address is neither sent nor stored; the form says so plainly instead of pretending to subscribe.
 */
export default function NewsletterForm() {
  const uid = useId()
  const inputRef = useRef(null)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | error | preview
  const [message, setMessage] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    const problem = validate(email)
    if (problem) {
      setStatus('error')
      setMessage(problem)
      inputRef.current?.focus()
      return
    }
    setStatus('preview')
    setMessage('Sign-up opens soon. Nothing has been saved or sent.')
  }

  const onChange = (e) => {
    setEmail(e.target.value)
    if (status !== 'idle') {
      setStatus('idle')
      setMessage('')
    }
  }

  const noteId = `${uid}-note`
  return (
    <div className="fervoro-footer-news">
      <h2 className="fervoro-footer-title">{NEWSLETTER.title}</h2>
      <p className="fervoro-footer-news-text">{NEWSLETTER.description}</p>

      <form className="fervoro-footer-form" onSubmit={onSubmit} noValidate>
        <label htmlFor={`${uid}-email`} className="sr-only">
          Email address
        </label>
        <input
          ref={inputRef}
          id={`${uid}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={onChange}
          aria-invalid={status === 'error'}
          aria-describedby={noteId}
          className="fervoro-footer-input"
          data-invalid={status === 'error'}
        />
        <button type="submit" className="fervoro-footer-submit">
          {NEWSLETTER.button}
        </button>
      </form>

      {/* Always rendered (two lines reserved) so announcing a message never shifts the layout. */}
      <p id={noteId} className="fervoro-footer-note" data-status={status} role="status" aria-live="polite">
        {message}
      </p>
      <p className="fervoro-footer-privacy">{NEWSLETTER.privacy}</p>
    </div>
  )
}
