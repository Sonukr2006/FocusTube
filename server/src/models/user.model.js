import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
    },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true, //  createdAt and updatedAt fields
  }
);


// Hashing the password before saving it to the database
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Comparing the password with the hashed password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function () {
  if (!this._id) {
    throw new Error("Invalid user ID for access token generation");
  }

  try {
    return jwt.sign(
      { userid: this._id, email: this.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );
  } catch (error) {
    console.error("Error generating access token:", error);
    throw new Error("Failed to generate access token");
  }
};

userSchema.methods.generateRefreshToken = function () {
  if (!this._id) {
    throw new Error("Invalid user ID for refresh token generation");
  }

  try {
    return jwt.sign(
      { userid: this._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    );
  } catch (error) {
    console.error("Error generating refresh token:", error);
    throw new Error("Failed to generate refresh token");
  }
};

const User = mongoose.model("User", userSchema);

export { User };
