const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTrips() {
  try {
    console.log('Seeding Routes, Buses, and Trips...');

    // Clear existing data (optional, but good for a fresh schedule)
    await prisma.ticket.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.bus.deleteMany({});
    await prisma.route.deleteMany({});

    // 1. Create Default Routes
    const route1 = await prisma.route.create({
      data: {
        name: 'Institute -> Sadar',
        origin: 'IIITDMJ Campus',
        destination: 'Sadar',
      }
    });

    const route2 = await prisma.route.create({
      data: {
        name: 'Sadar -> Institute',
        origin: 'Sadar',
        destination: 'IIITDMJ Campus',
      }
    });

    // 2. Create Buses
    const bus1 = await prisma.bus.create({
      data: {
        busNumber: 'BUS-01',
        registrationNumber: 'MP20 ZL1297',
        capacity: 50
      }
    });

    const bus2 = await prisma.bus.create({
      data: {
        busNumber: 'BUS-02',
        registrationNumber: 'MP20 ZV9297',
        capacity: 50
      }
    });

    // 3. Create Trips for Today
    const today = new Date().toISOString().split('T')[0];

    // Helper to generate a trip
    const createTrip = async (route, bus, departureTime, tripType, isOpen = false) => {
      // Parse departureTime like "15:40"
      const [hours, minutes] = departureTime.split(':');
      
      let bookingOpenAt, bookingCloseAt;
      
      if (isOpen) {
        // ALWAYS OPEN: Open 1 year ago, close 1 year from now
        bookingOpenAt = new Date();
        bookingOpenAt.setFullYear(bookingOpenAt.getFullYear() - 1);
        bookingCloseAt = new Date();
        bookingCloseAt.setFullYear(bookingCloseAt.getFullYear() + 1);
      } else {
        // Standard: Open 1 hour before departure, close at departure
        bookingOpenAt = new Date(`${today}T${departureTime}:00.000+05:30`);
        bookingOpenAt.setHours(bookingOpenAt.getHours() - 1);
        
        bookingCloseAt = new Date(`${today}T${departureTime}:00.000+05:30`);
      }

      await prisma.trip.create({
        data: {
          routeId: route.id,
          busId: bus.id,
          tripDate: today,
          departureTime,
          arrivalTime: null,
          tripType,
          capacity: 50,
          status: 'SCHEDULED',
          bookingOpenAt,
          bookingCloseAt
        }
      });
    };

    // --- SCHEDULE ---
    
    // ALWAYS OPEN SLOT (For testing)
    await createTrip(route1, bus1, '23:59', 'OUTBOUND', true);

    // Institute -> Sadar (Bus 1)
    await createTrip(route1, bus1, '15:40', 'OUTBOUND'); // 03:40 PM
    await createTrip(route1, bus1, '17:15', 'OUTBOUND'); // 05:15 PM
    await createTrip(route1, bus1, '19:00', 'OUTBOUND'); // 07:00 PM
    await createTrip(route1, bus1, '20:20', 'OUTBOUND'); // 08:20 PM
    
    // Sadar -> Institute (Bus 1)
    await createTrip(route2, bus1, '16:30', 'RETURN'); // 04:30 PM
    await createTrip(route2, bus1, '18:00', 'RETURN'); // 06:00 PM
    await createTrip(route2, bus1, '19:40', 'RETURN'); // 07:40 PM
    await createTrip(route2, bus1, '21:00', 'RETURN'); // 09:00 PM

    // Institute -> Sadar (Bus 2)
    await createTrip(route1, bus2, '15:00', 'OUTBOUND'); // 03:00 PM
    await createTrip(route1, bus2, '15:45', 'OUTBOUND'); // 03:45 PM
    await createTrip(route1, bus2, '18:00', 'OUTBOUND'); // 06:00 PM
    await createTrip(route1, bus2, '20:50', 'OUTBOUND'); // 08:50 PM

    // Sadar -> Institute (Bus 2)
    await createTrip(route2, bus2, '18:30', 'RETURN'); // 06:30 PM
    await createTrip(route2, bus2, '21:30', 'RETURN'); // 09:30 PM

    console.log('Seeding Complete. Test slot and schedule added!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedTrips();
