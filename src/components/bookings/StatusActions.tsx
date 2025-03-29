'use client'

interface StatusActionsProps {
  bookingId: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
}

export default function StatusActions({ bookingId, status }: StatusActionsProps) {
  if (status !== 'pending') {
    // Define styling for each status
    const statusStyles = {
      approved: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-red-700',
      cancelled: 'bg-orange-50 text-orange-700',
      completed: 'bg-blue-50 text-blue-700'
    };
    
    return (
      <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium ${
        statusStyles[status] || 'bg-gray-50 text-gray-700'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const updateBookingStatus = async (newStatus: 'approved' | 'rejected') => {
    console.log(`[StatusActions] Updating booking ${bookingId} status from ${status} to ${newStatus}`)
    
    const requestData = {
      bookingId,
      status: newStatus,
      previousStatus: status
    }
    
    console.log(`[StatusActions] Sending request data:`, requestData)
    
    try {
      const res = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      
      if (res.ok) {
        const responseData = await res.json()
        console.log(`[StatusActions] Status update successful:`, responseData)
        window.location.reload()
      } else {
        const errorData = await res.json()
        console.error(`[StatusActions] Status update failed:`, errorData)
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`[StatusActions] Error updating status:`, error)
      alert('An error occurred while updating the booking status')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => updateBookingStatus('approved')}
        className="rounded-full bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        Approve
      </button>
      <button
        onClick={() => updateBookingStatus('rejected')}
        className="rounded-full bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Reject
      </button>
    </div>
  )
} 