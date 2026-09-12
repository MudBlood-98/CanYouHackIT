const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const crypto = require('crypto');

// Create a Booking
router.post('/', authenticateToken, async (req, res) => {
  const { tripId } = req.body;
  const userId = req.user.id;
  const { prisma, io } = req;

  if (!tripId) {
    return res.status(400).json({ error: 'Trip ID is required.' });
  }

  try {
    // Perform booking inside a transaction to ensure integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Trip
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { route: true, bus: true }
      });

      if (!trip) {
        throw new Error('Trip not found.');
      }

      if (trip.status !== 'SCHEDULED' && trip.status !== 'ACTIVE') {
        throw new Error('Trip is no longer accepting bookings.');
      }

      // 2. Enforce 1-hour booking window
      const now = new Date();
      if (now < new Date(trip.bookingOpenAt)) {
        throw new Error('Booking window has not opened yet.');
      }
      if (now > new Date(trip.bookingCloseAt)) {
        throw new Error('Booking window has closed.');
      }

      // 3. Check for Duplicate Booking
      const existingBooking = await tx.booking.findUnique({
        where: {
          userId_tripId: { userId, tripId }
        }
      });

      if (existingBooking && existingBooking.status === 'CONFIRMED') {
        throw new Error('You have already booked this trip.');
      }

      // 4. Check Capacity
      const confirmedBookingsCount = await tx.booking.count({
        where: {
          tripId,
          status: 'CONFIRMED'
        }
      });

      if (confirmedBookingsCount >= trip.capacity) {
        throw new Error('Trip is fully booked.');
      }

      // 5. Create Booking
      const bookingReference = crypto.randomBytes(4).toString('hex').toUpperCase();
      const seatNumber = confirmedBookingsCount + 1; // Basic sequential seat assignment

      const newBooking = await tx.booking.create({
        data: {
          bookingReference,
          userId,
          tripId,
          seatNumber,
          status: 'CONFIRMED'
        }
      });

      // 6. Generate Ticket
      const ticketNumber = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const qrPayload = JSON.stringify({
        tkt: ticketNumber,
        ref: bookingReference,
        uid: userId,
        tid: tripId
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          bookingId: newBooking.id,
          userId,
          tripId,
          qrPayload,
          status: 'ACTIVE'
        }
      });

      // 7. Create Notification
      await tx.notification.create({
        data: {
          userId,
          type: 'BOOKING_CONFIRMED',
          title: 'Booking Confirmed',
          message: `Your booking for ${trip.route.name} at ${trip.departureTime} is confirmed. Seat: ${seatNumber}`,
          bookingId: newBooking.id,
          tripId: trip.id
        }
      });

      return { booking: newBooking, ticket, trip, confirmedBookingsCount };
    });

    // Notify clients about capacity change (Real-time sync)
    const { trip, confirmedBookingsCount } = result;
    const availableSeats = trip.capacity - (confirmedBookingsCount + 1);
    io.emit('trip.capacity.updated', { tripId, availableSeats, totalCapacity: trip.capacity });
    io.to(`user_${userId}`).emit('notification.new');

    res.json({ message: 'Booking successful', ...result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Get User's Active Tickets/Bookings
router.get('/my-tickets', authenticateToken, async (req, res) => {
  try {
    const { prisma } = req;
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'BOARDED'] }
      },
      include: {
        trip: {
          include: { route: true, bus: true }
        },
        booking: true
      },
      orderBy: { issuedAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
