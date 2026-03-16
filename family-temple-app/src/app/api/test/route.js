import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        return NextResponse.json({ message: 'MongoDB connected successfully to Kudumbakshethram database!' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
