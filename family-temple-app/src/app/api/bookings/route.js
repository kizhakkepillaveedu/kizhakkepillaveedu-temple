import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        await dbConnect();
        const data = await req.json();

        const { phone, houseName, devotees, vazhipads, totalAmount, paymentMethod } = data;

        if (!phone || !houseName || !devotees || !vazhipads || totalAmount === undefined) {
            return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
        }

        // Find the user by phone number
        const user = await User.findOne({ phone });
        if (!user) {
            return NextResponse.json({ error: 'User not found. Please log in first.' }, { status: 404 });
        }

        // Create the booking
        const booking = await Booking.create({
            userId: user._id,
            houseName,
            devotees,
            vazhipads,
            totalAmount,
            paymentMethod,
            paymentStatus: 'completed' // For now, we instantly assume completed.
        });

        // Send automated WhatsApp Receipt via UltraMsg
        try {
            const instanceId = process.env.ULTRAMSG_INSTANCE_ID; // e.g., instance12345
            const token = process.env.ULTRAMSG_TOKEN; // e.g., abc123def456

            if (instanceId && token) {
                let msg = `🙏 *Sree Kudumbakshethram - Vazhipad Booking* 🙏\n\n`;
                msg += `*Date:* ${new Date().toLocaleDateString('en-GB')}\n`;
                msg += `*Family:* ${houseName}\n\n`;
                msg += `*Devotees & Stars:*\n`;
                devotees.forEach(d => {
                    msg += `- ${d.name} (${d.nakshathram})\n`;
                });
                msg += `\n*Vazhipad Items:* ${vazhipads.map(v => v.name).join(', ')}\n`;
                msg += `*Total Amount:* ₹${totalAmount}\n`;
                msg += `*Payment Mode:* ${paymentMethod.toUpperCase()}\n\n`;
                msg += `_May Sree Paradevatha bless your family!_`;

                // UltraMsg requires phone numbers with country code but NO '+' sign
                let formattedPhone = phone;
                if (!formattedPhone.startsWith('91')) {
                    formattedPhone = `91${formattedPhone}`;
                }

                const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        token: token,
                        to: formattedPhone,
                        body: msg
                    })
                });

                const waResult = await response.json();
                console.log('WhatsApp Send Status:', waResult);
            } else {
                console.log('WhatsApp API Keys missing. Skipping automated receipt.');
            }
        } catch (waError) {
            console.error('Failed to send automated WhatsApp receipt:', waError);
            // We do NOT fail the whole booking process just because the WhatsApp text failed.
        }

        return NextResponse.json({ success: true, booking });

    } catch (error) {
        console.error('Booking failed:', error);
        return NextResponse.json({ error: 'Failed to process booking' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        await dbConnect();
        // Fetch all bookings and populate the user's name and phone
        const bookings = await Booking.find()
            .populate('userId', 'name phone')
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, bookings });
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}
