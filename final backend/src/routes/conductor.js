const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');

// Middleware to ensure the user is a conductor
const requireConductor = (req, res, next) => {
  if (req.user.role !== 'CONDUCTOR') {
    return res.status(403).json({ error: 'Access denied. Conductor role required.' });
  }
  next();
};

// Get today's trips and their passenger lists
router.get('/trips', authenticateToken, requireConductor, async (req, res) => {
  try {
    const { prisma } = req;
    
    const todayISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata'
    }).format(new Date());
    
    const trips = await prisma.trip.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        tripDate: todayISO
      },
      include: {
        route: true,
        bus: true,
        tickets: {
          where: { status: { in: ['ACTIVE', 'BOARDED'] } },
          include: { user: true, booking: true }
        }
      },
      orderBy: { departureTime: 'asc' }
    });

    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Verify and Board a Ticket
router.post('/verify', authenticateToken, requireConductor, async (req, res) => {
  const { qrPayload } = req.body;
  const { prisma, io } = req;

  if (!qrPayload) {
    return res.status(400).json({ error: 'QR Payload is required.' });
  }

  try {
    // Accept either the full QR JSON payload or the displayed ticket number.
    let payloadData;
    try {
      payloadData = JSON.parse(qrPayload);
    } catch (e) {
      payloadData = { tkt: String(qrPayload).trim() };
    }

    const { tkt } = payloadData;

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { ticketNumber: tkt },
        include: { user: true, trip: { include: { route: true } }, booking: true }
      });

      if (!ticket) throw new Error('Ticket not found in system.');
      if (payloadData.ref && ticket.booking.bookingReference !== payloadData.ref) throw new Error('Ticket signature mismatch.');
      if (ticket.status === 'BOARDED') throw new Error('Ticket already boarded.');
      if (ticket.status !== 'ACTIVE') throw new Error(`Invalid ticket status: ${ticket.status}`);
      
      const now = new Date();
      const expiresAt = ticket.validUntil || new Date(new Date(`${ticket.trip.tripDate}T${ticket.trip.departureTime}:00+05:30`).getTime() + 30 * 60 * 1000);
      if (now > expiresAt) {
        await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'EXPIRED' } });
        await tx.booking.update({ where: { id: ticket.bookingId }, data: { status: 'EXPIRED' } });
        throw new Error('Ticket expired: boarding time passed by more than 30 minutes.');
      }
      // Ensure trip hasn't completely finished
      if (ticket.trip.status === 'COMPLETED' || ticket.trip.status === 'CANCELLED') {
        throw new Error('Trip is no longer active.');
      }

      // Mark as boarded
      const seatNumber = ticket.booking.seatNumber;
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'BOARDED',
          boardedAt: now,
          verifiedAt: now,
          verifiedBy: req.user.id
        }
      });

      await tx.booking.update({
        where: { id: ticket.bookingId },
        data: { status: 'BOARDED' }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'TICKET_BOARDED',
          userId: req.user.id,
          details: `Conductor verified ticket ${tkt} for student ${ticket.user.rollNumber}`
        }
      });

      return { ticket: updatedTicket, seatNumber, passenger: ticket.user, trip: ticket.trip };
    });

    // Notify client via websocket
    io.to(`user_${result.passenger.id}`).emit('ticket.boarded', { ticketId: result.ticket.id });
    io.emit('trip.passengers.updated', { tripId: result.trip.id }); // Tell conductor screens to update

    res.json({
      message: 'VALID',
      passenger: result.passenger.name,
      rollNumber: result.passenger.rollNumber,
      seat: result.seatNumber,
      trip: result.trip.route.name
    });

  } catch (error) {
    console.error(error);
    // Explicitly return a 200 with INVALID status for the conductor UX to show the error nicely
    res.json({ message: 'INVALID', reason: error.message });
  }
});

module.exports = router;
