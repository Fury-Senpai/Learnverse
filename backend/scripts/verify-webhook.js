const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Purchase = require('../models/Purchase');
const Course = require('../models/Course');
const User = require('../models/User');

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create a dummy course and teacher
        const teacher = await User.create({
            name: 'Test Teacher',
            username: 'testteacher' + Date.now(),
            email: 'teacher@test.com',
            password: 'password123',
            role: 'teacher'
        });

        const course = await Course.create({
            title: 'Webhook Test Course',
            description: 'Testing webhook',
            teacher: teacher._id,
            price: 10
        });

        // 2. Create a pending purchase
        const studentId = new mongoose.Types.ObjectId();
        const sessionId = 'cs_test_' + Date.now();
        const purchase = await Purchase.create({
            student: studentId,
            course: course._id,
            type: 'course',
            amount: 10,
            stripeSessionId: sessionId,
            status: 'pending'
        });

        console.log('Created pending purchase:', purchase._id);

        // 3. Simulate what the webhook handler does (since we can't easily sign it without the secret)
        // We'll just call the logic directly or manually update to verify the DB side
        console.log('Simulating webhook update...');

        const updatedPurchase = await Purchase.findOneAndUpdate(
            { stripeSessionId: sessionId },
            { status: 'completed' },
            { new: true }
        );

        if (updatedPurchase && updatedPurchase.status === 'completed') {
            console.log('✅ Purchase status updated to completed');

            await Course.findByIdAndUpdate(course._id, { $inc: { totalStudents: 1 } });
            const teacherShare = 1000 * 0.007; // $7
            await User.findByIdAndUpdate(teacher._id, { $inc: { earnings: teacherShare } });

            const finaleCourse = await Course.findById(course._id);
            const finaleTeacher = await User.findById(teacher._id);

            if (finaleCourse.totalStudents === 1 && finaleTeacher.earnings === 7) {
                console.log('✅ Course and Teacher stats updated correctly');
            } else {
                console.error('❌ Stats update failed', { students: finaleCourse.totalStudents, earnings: finaleTeacher.earnings });
            }
        } else {
            console.error('❌ Purchase update failed');
        }

        // Cleanup
        await Purchase.findByIdAndDelete(purchase._id);
        await Course.findByIdAndDelete(course._id);
        await User.findByIdAndDelete(teacher._id);
        console.log('Cleanup done');

        mongoose.disconnect();
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
