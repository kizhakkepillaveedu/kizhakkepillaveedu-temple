'use client';

import { useState, useEffect } from 'react';
import './admin.css'; // We'll add corresponding styles shortly

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBookings, setExpandedBookings] = useState({});

    const toggleExpand = (id) => {
        setExpandedBookings(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        if (activeTab === 'bookings') {
            fetchBookings();
        }
    }, [activeTab]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/bookings');
            const data = await res.json();
            if (data.success) {
                setBookings(data.bookings);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
        setLoading(false);
    };

    return (
        <div className="admin-container">
            {/* Sidebar Navigation */}
            <aside className="admin-sidebar">
                <h2 className="serif text-gold">Temple Admin</h2>
                <nav>
                    <button
                        className={`admin-nav-btn ${activeTab === 'bookings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        📋 Vazhipad Bookings
                    </button>
                    <button
                        className={`admin-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 Devotee Register
                    </button>
                    <button
                        className={`admin-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        📢 Send Notifications
                    </button>
                    <button
                        className={`admin-nav-btn ${activeTab === 'rates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('rates')}
                    >
                        💰 Manage Rates
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">
                <header className="admin-header">
                    <h1 className="serif">Dashboard</h1>
                    <button className="logout-btn">Logout</button>
                </header>

                {/* Tab Content: Bookings */}
                {activeTab === 'bookings' && (
                    <section className="admin-section">
                        <h2 className="serif text-gold mb-4">Recent Vazhipad Receipts</h2>
                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Booked By (Family)</th>
                                        <th>Devotees & Stars</th>
                                        <th>Vazhipad Items</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading Bookings...</td></tr>
                                    ) : bookings.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center' }}>No bookings found.</td></tr>
                                    ) : bookings.map(booking => {
                                        const isExpanded = expandedBookings[booking._id];
                                        return (
                                            <tr key={booking._id}>
                                                <td style={{ verticalAlign: 'top' }}>{new Date(booking.createdAt).toLocaleDateString('en-GB')}</td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    <strong>{booking.houseName}</strong><br />
                                                    <span style={{ fontSize: '0.85em', color: '#aaa' }}>{booking.userId?.phone}</span>
                                                </td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    {booking.devotees?.length > 0 && (
                                                        <div style={{ marginBottom: '5px' }}>
                                                            {booking.devotees.length} Devotees
                                                        </div>
                                                    )}
                                                    <button
                                                        className="action-btn"
                                                        style={{ padding: '2px 8px', fontSize: '0.8rem', background: 'transparent', border: '1px solid #E2B659', color: '#E2B659', marginBottom: isExpanded ? '10px' : '0' }}
                                                        onClick={() => toggleExpand(booking._id)}
                                                    >
                                                        {isExpanded ? 'Hide Details' : 'Show More +'}
                                                    </button>
                                                    {isExpanded && (
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: '5px', fontSize: '0.9rem' }}>
                                                            {booking.devotees?.map((d, i) => (
                                                                <li key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '3px', marginBottom: '3px' }}>
                                                                    <span style={{ color: '#E2B659' }}>{d.name}</span> - {d.nakshathram}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                                <td style={{ verticalAlign: 'top' }}>{booking.vazhipads?.map(v => v.name).join(', ')}</td>
                                                <td style={{ verticalAlign: 'top' }}>₹{booking.totalAmount}</td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    <span className={`status-badge ${booking.paymentStatus}`}>{booking.paymentStatus}</span>
                                                </td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    <button className="action-btn">Print</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Tab Content: Notifications */}
                {activeTab === 'notifications' && (
                    <section className="admin-section">
                        <h2 className="serif text-gold mb-4">Mass Notify Devotees</h2>
                        <div className="notification-form">
                            <label>Select Audience:</label>
                            <select className="admin-input">
                                <option>All Registered Members</option>
                                <option>Only Paid Bookings</option>
                            </select>

                            <label>Message Type:</label>
                            <select className="admin-input">
                                <option>Upcoming Pooja Alert</option>
                                <option>Festival Announcement</option>
                                <option>General Update</option>
                            </select>

                            <label>Message Content (Sent via WhatsApp):</label>
                            <textarea
                                className="admin-input textarea"
                                rows="5"
                                placeholder="e.g., Dear Devotee, special Navaratri poojas are starting next week..."
                            ></textarea>

                            <button className="send-msg-btn">Send WhatsApp Broadcast</button>
                        </div>
                    </section>
                )}

                {/* Tab Content Placeholder for Users and Rates */}
                {(activeTab === 'users' || activeTab === 'rates') && (
                    <section className="admin-section text-center">
                        <h2 className="serif text-gold mb-4">Under Construction</h2>
                        <p>This panel will display data dynamically from MongoDB once connected.</p>
                    </section>
                )}

            </main>
        </div >
    );
}
