import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { sendSignedWebhook, logWebhookDelivery } from '@/utils/webhookService';

// Add this interface:
interface BookingDetails {
  _id: ObjectId;
  facilityId?: ObjectId;
  startupId?: ObjectId;
  incubatorId?: ObjectId;
  serviceProviderId?: ObjectId;
  rentalPlan?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  requestedAt?: Date;
  amount?: number;
  facilityName?: string;
  facilityType?: string;
  startupName?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Updates a booking's status in the database and triggers webhook if needed
 */
export async function updateBookingStatus(
  bookingId: string, 
  newStatus: string, 
  previousStatus: string
) {
  try {
    console.log(`[BookingService] Updating booking ${bookingId} status from ${previousStatus} to ${newStatus}`);
    
    const client = await clientPromise;
    const db = client.db('Cumma');
    
    // First, find the existing booking document
    const booking = await db.collection('bookings').findOne({ 
      _id: new ObjectId(bookingId) 
    });
    
    if (!booking) {
      console.error(`[BookingService] No booking found with ID ${bookingId}`);
      return { success: false, message: 'Booking not found' };
    }
    
    // Update status in the document
    booking.status = newStatus;
    booking.updatedAt = new Date();
    booking.processedAt = new Date();
    
    // Replace the entire document to avoid validation errors
    const result = await db.collection('bookings').replaceOne(
      { _id: new ObjectId(bookingId) },
      booking
    );
    
    if (result.matchedCount === 0) {
      console.error(`[BookingService] No booking found with ID ${bookingId}`);
      return { success: false, message: 'Booking not found' };
    }
    
    if (result.modifiedCount === 0) {
      console.log(`[BookingService] Booking ${bookingId} status was already ${newStatus}`);
      return { success: true, message: 'No changes were necessary' };
    }
    
    console.log(`[BookingService] Successfully updated booking status in database`);
    
    // After successful database update, check if we need to send a webhook
    if (newStatus.toLowerCase() === 'approved' && previousStatus.toLowerCase() === 'pending') {
      console.log(`[BookingService] Status changed from pending to approved, preparing webhook`);
      
      // Fetch complete booking details for the webhook
      const bookingDetails = await fetchBookingDetails(bookingId);
      
      // Ensure bookingDetails has all required fields for notifications
      bookingDetails.facilityName = bookingDetails.facilityName || 'Unknown Facility';
      bookingDetails.startupName = bookingDetails.startupName || 'Unknown Startup';
      
      // Make sure start and end dates are properly set
      if (!bookingDetails.startDate && bookingDetails.requestedAt) {
        bookingDetails.startDate = bookingDetails.requestedAt;
      }
      
      if (!bookingDetails.endDate && bookingDetails.startDate) {
        // Calculate end date if not present
        const endDate = new Date(bookingDetails.startDate);
        const rentalPlan = bookingDetails.rentalPlan || 'Monthly';
        
        if (rentalPlan === 'Annual') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (rentalPlan === 'Monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (rentalPlan === 'Weekly') {
          endDate.setDate(endDate.getDate() + 7);
        } else if (rentalPlan.includes('Day')) {
          endDate.setDate(endDate.getDate() + 1);
        }
        
        bookingDetails.endDate = endDate;
      }
      
      try {
        // Also create a notification in the database
        await createBookingApprovalNotification(bookingId, bookingDetails);
      } catch (notificationError) {
        console.error(`[BookingService] Error creating notification:`, notificationError);
        // Continue even if notification creation fails
      }
      
      // Prepare webhook payload
      const webhookPayload = {
        bookingId,
        status: newStatus,
        previousStatus,
        serviceProviderId: bookingDetails.incubatorId || bookingDetails.serviceProviderId,
        facilityName: bookingDetails.facilityName,
        startupName: bookingDetails.startupName,
        startDate: bookingDetails.startDate,
        endDate: bookingDetails.endDate,
        facilityType: bookingDetails.facilityType
      };
      
      // Get webhook URL and secret from environment
      const webhookUrl = process.env.BOOKING_WEBHOOK_URL || 'https://your-main-app-url.com/api/webhooks/booking-status';
      const webhookSecret = process.env.WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('[BookingService] WEBHOOK_SECRET is not configured in environment variables');
        return { 
          success: true, 
          webhookSent: false, 
          message: 'Booking status updated but webhook not sent - missing secret' 
        };
      }
      
      // Send webhook
      const webhookSent = await sendSignedWebhook({
        url: webhookUrl,
        payload: webhookPayload,
        secret: webhookSecret
      });
      
      // Log webhook delivery attempt
      await logWebhookDelivery(
        'booking-status-change',
        webhookPayload,
        webhookSent,
        webhookSent ? null : 'Failed to send webhook'
      );
      
      return { 
        success: true, 
        webhookSent, 
        message: webhookSent 
          ? 'Booking status updated and notification sent' 
          : 'Booking status updated but failed to send notification'
      };
    }
    
    // If no webhook needed, just return success
    return { success: true, webhookSent: false, message: 'Booking status updated' };
  } catch (error) {
    console.error('[BookingService] Error updating booking status:', error);
    return { success: false, message: 'Failed to update booking status', error };
  }
}

/**
 * Creates a notification for booking approval
 */
async function createBookingApprovalNotification(bookingId: string, bookingDetails: any) {
  try {
    const client = await clientPromise;
    const db = client.db('Cumma');
    
    // Format dates for the notification
    const formatDate = (date: Date) => {
      return date instanceof Date 
        ? date.toISOString().split('T')[0] 
        : new Date(date).toISOString().split('T')[0];
    };
    
    // Create notification in database based on the schema
    const notification = {
      userId: bookingDetails.startupId?.toString() || 'unknown',
      type: 'booking-approved',
      title: 'Booking Approved',
      message: `Your booking for "${bookingDetails.facilityName}" has been approved.`,
      relatedId: bookingId,
      relatedType: 'booking',
      isRead: false,
      createdAt: new Date(),
      metadata: {
        facilityName: bookingDetails.facilityName || 'Unknown Facility',
        startupName: bookingDetails.startupName || 'Unknown Startup',
        facilityType: bookingDetails.facilityType || 'unknown',
        startDate: formatDate(bookingDetails.startDate),
        endDate: formatDate(bookingDetails.endDate)
      }
    };
    
    console.log(`[BookingService] Creating notification:`, notification);
    
    await db.collection('notifications').insertOne(notification);
    console.log(`[BookingService] Notification created successfully`);
  } catch (error) {
    console.error(`[BookingService] Error creating notification:`, error);
    throw error;
  }
}

/**
 * Fetches detailed booking information needed for the webhook
 */
async function fetchBookingDetails(bookingId: string): Promise<BookingDetails> {
  try {
    console.log(`[BookingService] Fetching details for booking ${bookingId}`);
    const client = await clientPromise;
    const db = client.db('Cumma');
    
    const booking = await db.collection('bookings').findOne({ 
      _id: new ObjectId(bookingId) 
    });
    
    if (!booking) {
      throw new Error(`Booking not found with ID ${bookingId}`);
    }
    
    // Get facility details
    const facility = await db.collection('Facilities').findOne({
      _id: new ObjectId(booking.facilityId)
    });
    
    // Get startup details
    const startup = await db.collection('Startups').findOne({
      _id: new ObjectId(booking.startupId)
    });
    
    const bookingDetails = {
      ...booking,
      facilityName: facility?.details?.name || 'Unknown Facility',
      facilityType: facility?.facilityType || 'unknown',
      startupName: startup?.startupName || 'Unknown Startup',
      startDate: booking.requestedAt,
      endDate: booking.requestedAt // This should be calculated based on rental plan
    };
    
    console.log(`[BookingService] Successfully fetched booking details`);
    return bookingDetails;
  } catch (error) {
    console.error('[BookingService] Error fetching booking details:', error);
    throw error;
  }
} 