const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');

// Get all active trips for today
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { prisma } = req;
    
    // In a real app, use the user's timezone to determine 'today'
    const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }).split(',')[0];
    const todayISO = new Date(today).toISOString().split('T')[0]; // Simple format assuming today is correct
    // For prototype simplicity, we will just fetch all SCHEDULED/ACTIVE trips
    
    const trips = await prisma.trip.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        // tripDate: todayISO, // Commented out to ensure demo trips show up regardless of current Date object alignment issues
      },
      include: {
        route: true,
        bus: true,
        _count: {
          select: { bookings: { where: { status: 'CONFIRMED' } } }
        }
      },
      orderBy: {
        departureTime: 'asc'
      }
    });

    const now = new Date();

    // Map trips to include available capacity and booking window status
    const formattedTrips = trips.map(trip => {
      const bookedCount = trip._count.bookings;
      const availableSeats = Math.max(0, trip.capacity - bookedCount);
      
      const isBookingOpen = now >= new Date(trip.bookingOpenAt) && now <= new Date(trip.bookingCloseAt);
      
      return {
        id: trip.id,
        route: trip.route.name,
        origin: trip.route.origin,
        destination: trip.route.destination,
        busNumber: trip.bus.busNumber,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        tripType: trip.tripType,
        totalCapacity: trip.capacity,
        availableSeats,
        isBookingOpen,
        bookingOpenAt: trip.bookingOpenAt,
        bookingCloseAt: trip.bookingCloseAt,
        status: trip.status
      };
    });

    res.json(formattedTrips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
