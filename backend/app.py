"""
CanYouHackIT - College Bus Management System
Backend API built with Flask
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime
import json

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global variables
DATABASE_PATH = os.path.join(os.path.dirname(__file__), '../database/DATABASE 25.xlsx')
students_db = {}
buses_db = {}
bookings_db = {}

# ==================== INITIALIZATION ====================

def load_database():
    """Load bus and student data from Excel file"""
    global buses_db, students_db
    
    try:
        # Try to load Excel file
        if os.path.exists(DATABASE_PATH):
            excel_file = pd.ExcelFile(DATABASE_PATH)
            print(f"✓ Excel file loaded. Sheets: {excel_file.sheet_names}")
            
            # Load each sheet into a dictionary
            for sheet in excel_file.sheet_names:
                data = pd.read_excel(DATABASE_PATH, sheet_name=sheet)
                print(f"  - {sheet}: {len(data)} rows")
        else:
            print(f"⚠ Database file not found at {DATABASE_PATH}")
            print("Using demo data instead...")
    except Exception as e:
        print(f"⚠ Error loading database: {e}")
        print("Using demo data instead...")
    
    # Demo data - replace with real Excel data
    buses_db = {
        "1": {
            "id": "1",
            "number": "01",
            "registration": "MP20 ZL1297",
            "capacity": 34,
            "current_occupancy": 8,
            "route": "Institute to Sadar Via Russel Chowk",
            "stops": ["Main Gate 1", "Dumna Airport T-Point", "Ghamapur", "Russel Chowk", "Sadar Bazar"],
            "conductor": "Mr. Tilak Singh",
            "conductor_phone": "+91 9826346178",
            "departure_time": "17:15",
            "arrival_time": "17:45",
            "fare": 20.00,
            "status": "active"
        },
        "2": {
            "id": "2",
            "number": "02",
            "registration": "MP20 ZL1305",
            "capacity": 34,
            "current_occupancy": 3,
            "route": "Institute to Railway Station (Jabalpur Junction)",
            "stops": ["Dumna Road", "High Court Chowk", "Jabalpur Junction Platform 1"],
            "conductor": "Mr. Ramesh Patel",
            "conductor_phone": "+91 9425155203",
            "departure_time": "18:30",
            "arrival_time": "19:00",
            "fare": 25.00,
            "status": "active"
        },
        "3": {
            "id": "3",
            "number": "03",
            "registration": "MP20 ZL1310",
            "capacity": 34,
            "current_occupancy": 12,
            "route": "Sadar Return Express to Campus",
            "stops": ["Sadar Post Office", "Empire Talkies Chowk", "Khamaria Gate", "Dumna", "IIITDMJ Campus"],
            "conductor": "Mr. Rajesh Kumar",
            "conductor_phone": "+91 9827654321",
            "departure_time": "20:00",
            "arrival_time": "20:45",
            "fare": 20.00,
            "status": "active"
        }
    }
    
    students_db = {
        "2022CS104": {
            "roll_number": "2022CS104",
            "name": "Aryan Sharma",
            "email": "aryan.sharma@iiitdmj.ac.in",
            "phone": "9876543210",
            "hall": "H3",
            "password_hash": "hashed_password_here",  # Should be properly hashed in production
            "balance": 500.00,
            "active_tickets": ["ticket_001"]
        }
    }

# Load database on startup
load_database()

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({
        'status': 'online',
        'timestamp': datetime.now().isoformat(),
        'message': 'CanYouHackIT Backend API is running'
    }), 200

# ==================== BUS ENDPOINTS ====================

@app.route('/api/buses', methods=['GET'])
def get_all_buses():
    """Get all available buses"""
    try:
        buses_list = []
        for bus_id, bus in buses_db.items():
            seats_available = bus['capacity'] - bus['current_occupancy']
            bus['seats_available'] = seats_available
            buses_list.append(bus)
        
        return jsonify({
            'status': 'success',
            'data': buses_list,
            'count': len(buses_list)
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/buses/<bus_id>', methods=['GET'])
def get_bus(bus_id):
    """Get specific bus details"""
    try:
        if bus_id in buses_db:
            bus = buses_db[bus_id].copy()
            bus['seats_available'] = bus['capacity'] - bus['current_occupancy']
            return jsonify({
                'status': 'success',
                'data': bus
            }), 200
        else:
            return jsonify({'status': 'error', 'message': 'Bus not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== BOOKING ENDPOINTS ====================

@app.route('/api/book', methods=['POST'])
def book_bus():
    """Book a seat on a bus"""
    try:
        data = request.json
        bus_id = data.get('bus_id')
        student_id = data.get('student_id')
        
        # Validation
        if not bus_id or not student_id:
            return jsonify({'status': 'error', 'message': 'Missing bus_id or student_id'}), 400
        
        if bus_id not in buses_db:
            return jsonify({'status': 'error', 'message': 'Bus not found'}), 404
        
        if student_id not in students_db:
            return jsonify({'status': 'error', 'message': 'Student not found'}), 404
        
        bus = buses_db[bus_id]
        student = students_db[student_id]
        
        # Check seat availability
        if bus['current_occupancy'] >= bus['capacity']:
            return jsonify({'status': 'error', 'message': 'Bus is full'}), 400
        
        # Check balance
        if student['balance'] < bus['fare']:
            return jsonify({'status': 'error', 'message': 'Insufficient balance'}), 400
        
        # Process booking
        ticket_id = f"ticket_{len(bookings_db) + 1:04d}"
        booking = {
            'ticket_id': ticket_id,
            'bus_id': bus_id,
            'student_id': student_id,
            'student_name': student['name'],
            'bus_number': bus['number'],
            'route': bus['route'],
            'departure_time': bus['departure_time'],
            'fare': bus['fare'],
            'booking_time': datetime.now().isoformat(),
            'status': 'confirmed'
        }
        
        bookings_db[ticket_id] = booking
        
        # Update bus occupancy
        buses_db[bus_id]['current_occupancy'] += 1
        
        # Deduct fare from student balance
        students_db[student_id]['balance'] -= bus['fare']
        students_db[student_id]['active_tickets'].append(ticket_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Booking confirmed',
            'data': booking
        }), 201
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/bookings/<student_id>', methods=['GET'])
def get_student_bookings(student_id):
    """Get all bookings for a student"""
    try:
        if student_id not in students_db:
            return jsonify({'status': 'error', 'message': 'Student not found'}), 404
        
        student_bookings = [
            booking for booking in bookings_db.values() 
            if booking['student_id'] == student_id
        ]
        
        return jsonify({
            'status': 'success',
            'data': student_bookings,
            'count': len(student_bookings)
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/bookings/<ticket_id>', methods=['DELETE'])
def cancel_booking(ticket_id):
    """Cancel a booking and refund fare"""
    try:
        if ticket_id not in bookings_db:
            return jsonify({'status': 'error', 'message': 'Booking not found'}), 404
        
        booking = bookings_db[ticket_id]
        bus_id = booking['bus_id']
        student_id = booking['student_id']
        fare = booking['fare']
        
        # Update bus occupancy
        buses_db[bus_id]['current_occupancy'] -= 1
        
        # Refund to student
        students_db[student_id]['balance'] += fare
        students_db[student_id]['active_tickets'].remove(ticket_id)
        
        # Update booking status
        bookings_db[ticket_id]['status'] = 'cancelled'
        
        return jsonify({
            'status': 'success',
            'message': 'Booking cancelled and refunded',
            'refunded_amount': fare
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== STUDENT ENDPOINTS ====================

@app.route('/api/students/<student_id>', methods=['GET'])
def get_student(student_id):
    """Get student profile"""
    try:
        if student_id not in students_db:
            return jsonify({'status': 'error', 'message': 'Student not found'}), 404
        
        student = students_db[student_id].copy()
        student.pop('password_hash', None)  # Don't send password hash
        
        return jsonify({
            'status': 'success',
            'data': student
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/students/<student_id>/balance', methods=['GET'])
def get_balance(student_id):
    """Get student wallet balance"""
    try:
        if student_id not in students_db:
            return jsonify({'status': 'error', 'message': 'Student not found'}), 404
        
        balance = students_db[student_id]['balance']
        
        return jsonify({
            'status': 'success',
            'student_id': student_id,
            'balance': balance
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/students/<student_id>/recharge', methods=['POST'])
def recharge_balance(student_id):
    """Recharge student wallet"""
    try:
        data = request.json
        amount = data.get('amount')
        
        if not amount or amount <= 0:
            return jsonify({'status': 'error', 'message': 'Invalid amount'}), 400
        
        if student_id not in students_db:
            return jsonify({'status': 'error', 'message': 'Student not found'}), 404
        
        students_db[student_id]['balance'] += amount
        new_balance = students_db[student_id]['balance']
        
        return jsonify({
            'status': 'success',
            'message': f'Recharge successful. New balance: ₹{new_balance}',
            'new_balance': new_balance
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== CONDUCTOR ENDPOINTS ====================

@app.route('/api/conductor/verify', methods=['POST'])
def verify_ticket():
    """Conductor scans QR/ticket to verify"""
    try:
        data = request.json
        ticket_id = data.get('ticket_id')
        
        if ticket_id not in bookings_db:
            return jsonify({'status': 'error', 'message': 'Ticket not found'}), 404
        
        booking = bookings_db[ticket_id]
        
        return jsonify({
            'status': 'success',
            'data': {
                'ticket_id': ticket_id,
                'student_name': booking['student_name'],
                'bus_number': booking['bus_number'],
                'valid': booking['status'] == 'confirmed'
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Student login endpoint"""
    try:
        data = request.json
        roll_number = data.get('roll_number')
        password = data.get('password')
        
        if not roll_number or not password:
            return jsonify({'status': 'error', 'message': 'Missing credentials'}), 400
        
        if roll_number not in students_db:
            return jsonify({'status': 'error', 'message': 'Student not found'}), 404
        
        # In production, use proper password hashing (bcrypt, argon2)
        student = students_db[roll_number]
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'roll_number': roll_number,
                'name': student['name'],
                'email': student['email'],
                'balance': student['balance']
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Student registration endpoint"""
    try:
        data = request.json
        roll_number = data.get('roll_number')
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        
        if not all([roll_number, name, email, phone]):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        if roll_number in students_db:
            return jsonify({'status': 'error', 'message': 'Student already registered'}), 400
        
        students_db[roll_number] = {
            'roll_number': roll_number,
            'name': name,
            'email': email,
            'phone': phone,
            'hall': 'Not specified',
            'password_hash': 'hashed_password',
            'balance': 0.00,
            'active_tickets': []
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Registration successful',
            'data': {'roll_number': roll_number, 'name': name}
        }), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'status': 'error', 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 CanYouHackIT Backend API Starting...")
    print("="*60)
    print(f"📊 Buses loaded: {len(buses_db)}")
    print(f"👥 Students loaded: {len(students_db)}")
    print(f"🎫 Bookings: {len(bookings_db)}")
    print("\n📍 API running at: http://localhost:5000")
    print("📖 Health check: http://localhost:5000/api/health")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
