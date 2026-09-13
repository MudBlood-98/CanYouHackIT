const cron = require('node-cron');

module.exports = function (prisma, io) {
  // Keep ticket expiry within one minute of the 30-minute cutoff.
  cron.schedule('* * * * *', async () => {
    console.log('--- Executing ticket expiry check ---');
    try {
      const now = new Date();

      // 1. Mark past ACTIVE/SCHEDULED trips as COMPLETED
      await prisma.trip.updateMany({
        where: {
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          bookingCloseAt: { lt: now } // Simple heuristic: if booking is closed and it's midnight, it's done
        },
        data: { status: 'COMPLETED' }
      });

      // 2. Expire tickets after the departure plus 30-minute boarding grace period.
      const expiredTickets = await prisma.ticket.updateMany({
        where: {
          status: { in: ['ACTIVE', 'BOARDED'] },
          validUntil: { lte: now }
        },
        data: { status: 'EXPIRED' }
      });

      console.log(`Expired ${expiredTickets.count} unused tickets.`);

      // 3. Mark old confirmed bookings as EXPIRED
      await prisma.booking.updateMany({
        where: {
          status: { in: ['CONFIRMED', 'BOARDED'] },
          ticket: { status: 'EXPIRED' }
        },
        data: { status: 'EXPIRED' }
      });

      // (In a complete system, we would also generate the next day's scheduled trips here based on templates)
      console.log('--- Midnight Refresh Complete ---');
    } catch (error) {
      console.error('Midnight Refresh failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};
