'use client'

import { useState } from 'react'

interface StatusActionsProps {
  facilityId: string;
  status: 'pending' | 'active' | 'rejected';
  onStatusChange: () => Promise<void>;
}

export default function StatusActions({ facilityId, status, onStatusChange }: StatusActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusUpdate = async (newStatus: 'active' | 'rejected') => {
    try {
      setIsLoading(true)
      setError(null)
      
      const requestData = {
        facilityId,
        status: newStatus,
        previousStatus: status
      }
      
      const res = await fetch('/api/facilities/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      
      if (res.ok) {
        const responseData = await res.json()
        console.log(`[StatusActions] Status update successful:`, responseData)
        // Call the onStatusChange callback to refresh the UI
        await onStatusChange()
      } else {
        const errorData = await res.json()
        console.error(`[StatusActions] Status update failed:`, errorData)
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`[StatusActions] Error updating status:`, error)
      alert('An error occurred while updating the facility status')
    } finally {
      setIsLoading(false)
    }
  }

  if (status !== 'pending') {
    return (
      <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium ${
        status === 'active' 
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => handleStatusUpdate('active')}
        className="rounded-full bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        Approve
      </button>
      <button
        onClick={() => handleStatusUpdate('rejected')}
        className="rounded-full bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Reject
      </button>
    </div>
  )
} 