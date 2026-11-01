import { Navigate } from 'react-router-dom'

/**
 * Contact content has been merged into the Operator Profile page (FEATURE 6).
 */
export default function Contact() {
  return <Navigate to="/profile" replace />
}
