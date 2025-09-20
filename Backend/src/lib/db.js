import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        //      {
        //     useNewUrlParser: true,
        //     useUnifiedTopology: true
        // });
        console.log(`MongoDb connected :${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1); // 1 means failure
    }
};


