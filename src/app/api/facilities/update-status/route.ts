import { NextResponse } from 'next/server'
import { updateFacilityStatus } from '@/services/facilityService'

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { facilityId, status, previousStatus: clientProvidedStatus } = requestData
    
    console.log(`[API] Processing facility status update request:`, JSON.stringify(requestData, null, 2))
    
    if (!facilityId || !status) {
      console.error('[API] Missing required fields in request')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Use our service to update the facility and handle the webhook
    const result = await updateFacilityStatus(facilityId, status, clientProvidedStatus)
    
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
    console.error(`[API] Error updating facility status:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 