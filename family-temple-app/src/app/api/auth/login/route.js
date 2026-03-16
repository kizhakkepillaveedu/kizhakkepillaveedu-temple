import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        await dbConnect();
        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 });
        }

        let user = await User.findOne({ phone });

        if (user) {
            if (user.password !== password) {
                return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
            }
        } else {
            // Create new user if they don't exist
            user = await User.create({ phone, password });
        }

        return NextResponse.json({
            success: true,
            user: {
                _id: user._id,
                phone: user.phone,
                name: user.name,
                address: user.address,
                role: user.role
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Phone number already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
