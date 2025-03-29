import { NextResponse } from 'next/server'
import { updateBookingStatus } from '@/services/bookingService'

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { bookingId, status, previousStatus: clientProvidedStatus } = requestData
    
    console.log(`[API] Processing booking status update request:`, JSON.stringify(requestData, null, 2))
    
    if (!bookingId || !status) {
      console.error('[API] Missing required fields in request')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Use our service to update the booking and handle the webhook
    const result = await updateBookingStatus(bookingId, status, clientProvidedStatus)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: result.message,
      webhookSent: result.webhookSent
    })
  } catch (error) {
    console.error(`[API] Error updating booking status:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 