const cron = require('node-cron');

module.exports = function(prisma, io) {
  // Run every day at Midnight Asia/Kolkata
  cron.schedule('0 0 * * *', async () => {
    console.log('--- Executing Midnight Refresh (Asia/Kolkata) ---');
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

      // 2. Expire active tickets for trips that are now completed
      const expiredTickets = await prisma.ticket.updateMany({
        where: {
          status: 'ACTIVE',
          trip: { status: 'COMPLETED' }
        },
        data: { status: 'EXPIRED' }
      });
      
      console.log(`Expired ${expiredTickets.count} unused tickets.`);

      // 3. Mark old confirmed bookings as EXPIRED
      await prisma.booking.updateMany({
        where: {
          status: 'CONFIRMED',
          trip: { status: 'COMPLETED' }
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
