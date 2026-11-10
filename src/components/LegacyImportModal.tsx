import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Toast } from '~/components/ui'
import { useAuth } from '~/context/AuthContext'
import { useFlights } from '~/hooks/useFlights'
import { clearLegacyFlights, queueLegacyImport, readLegacyFlights } from '~/lib/flightStore'
import { chooseLegacyToImport } from '~/lib/legacyImport'
import { onNotice } from '~/lib/syncEngine'
import type { Flight } from '~/types'

/**
 * One-time offer to move flights saved on this device (before accounts) into the signed-in account.
 * Waits for the first download so "N flights" only counts flights the account does not already have.
 */
export function LegacyImportModal() {
  const { user } = useAuth()
  const { flights, downloaded } = useFlights()
  const [candidates, setCandidates] = useState<Flight[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const checkedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !downloaded || checkedFor.current === user.id) return
    checkedFor.current = user.id
    const legacy = readLegacyFlights()
    if (legacy.length === 0) return
    const missing = chooseLegacyToImport(legacy, flights)
    if (missing.length === 0) {
      clearLegacyFlights() // all of them are already in the account
      return
    }
    setCandidates(missing)
  }, [user, downloaded, flights])

  const close = () => setCandidates(null)

  const add = () => {
    if (!candidates) return
    const { queued, skipped } = queueLegacyImport(candidates)
    close()
    if (skipped.length > 0) {
      setMessage(`Added ${queued}. Skipped ${skipped.length} that could not be saved (${[...new Set(skipped.map((s) => s.reason))].join(', ')}).`)
    }
  }

  const decline = () => {
    clearLegacyFlights()
    close()
  }

  return (
    <>
      <Modal isOpen={candidates !== null} onClose={close} title="Add your saved flights?" size="sm" showCloseButton={false}>
        <div className="space-y-4">
          <p className="text-navy-600">
            We found {candidates?.length ?? 0} {candidates?.length === 1 ? 'flight' : 'flights'} saved on this device.
            Add {candidates?.length === 1 ? 'it' : 'them'} to your account?
          </p>
          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={add}>Add to my account</Button>
            <Button variant="secondary" fullWidth onClick={decline}>Don't add</Button>
          </div>
        </div>
      </Modal>
      {message && <Toast type="warning" title="Some flights were skipped" message={message} onClose={() => setMessage(null)} />}
    </>
  )
}

/** Shows a Toast when the sync engine drops a change it can't save. */
export function SyncNotices() {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => onNotice((m) => setMessage(m)), [])
  if (!message) return null
  return <Toast type="warning" title={message} onClose={() => setMessage(null)} />
}
