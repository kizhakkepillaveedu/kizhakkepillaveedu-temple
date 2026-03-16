import mongoose from 'mongoose';

const VazhipadItemSchema = new mongoose.Schema({
    name: String,   // e.g., 'Pushpanjali'
    price: Number,  // e.g., 50
});

const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nakshathram: { type: String, required: true },
});

const BookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    houseName: {
        type: String,
        required: true,
    },
    devotees: [MemberSchema],
    vazhipads: [VazhipadItemSchema],
    totalAmount: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'netbanking', 'cash'],
        default: 'upi',
    }
}, { timestamps: true });

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
