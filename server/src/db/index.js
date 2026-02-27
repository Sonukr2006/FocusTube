import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const rawUri = process.env.MONGODB_URI;
        if (!rawUri) {
            throw new Error("MONGODB_URI is not set");
        }

        const hasDbName = /mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(rawUri);
        const [baseUri, queryString] = rawUri.split("?");
        const normalizedBaseUri = baseUri.endsWith("/") ? baseUri.slice(0, -1) : baseUri;
        const connectionUri = hasDbName
            ? rawUri
            : queryString
                ? `${normalizedBaseUri}/${DB_NAME}?${queryString}`
                : `${normalizedBaseUri}/${DB_NAME}`;

        const connectionInstance = await mongoose.connect(connectionUri)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB
