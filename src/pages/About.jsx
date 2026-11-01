import { Navigate } from 'react-router-dom'

/**
 * About content has been merged into the Operator Profile page (FEATURE 6).
 */
export default function About() {
  return <Navigate to="/profile" replace />
}
