import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        await dbConnect();
        const { phone, name, address } = await req.json();

        if (!phone || !name || !address) {
            return NextResponse.json({ error: 'Phone, name, and address are required' }, { status: 400 });
        }

        const user = await User.findOneAndUpdate(
            { phone },
            { name, address },
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
