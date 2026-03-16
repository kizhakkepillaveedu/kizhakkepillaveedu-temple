
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const mongoUriMatch = envContent.match(/MONGODB_URI=(.*)/);
const MONGODB_URI = mongoUriMatch ? mongoUriMatch[1].trim() : null;

const UserSchema = new mongoose.Schema({
    phone: String,
    password: String,
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function checkUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        const user = await User.findOne({ phone: '8848109106' });
        if (user) {
            console.log('PASSWORD_IS:', user.password);
        } else {
            console.log('USER_NOT_FOUND');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

checkUser();
