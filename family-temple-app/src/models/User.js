import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Please provide a phone number'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
    },
    name: {
        type: String,
    },
    address: {
        type: String,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
