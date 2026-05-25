import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    xp: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    goldCoins: {
      type: Number,
      required: true,
      default: 100
    },
    stats: {
      duelsPlayed: {
        type: Number,
        required: true,
        default: 0
      },
      wins: {
        type: Number,
        required: true,
        default: 0
      },
      currentStreak: {
        type: Number,
        required: true,
        default: 0
      }
    },
    status: {
      type: String,
      enum: ['Available', 'In-Queue', 'In-Battle', 'Offline'],
      default: 'Offline',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
  }
);

// Level calculated dynamically on user profile access: Math.floor(xp / 100) + 1
UserSchema.virtual('level').get(function () {
  return Math.floor(this.xp / 100) + 1;
});

// Pre-save password cryptographic hashing hook
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password || '', salt);
  } catch (err) {
    throw err;
  }
});

// Instance method to check password candidate matching
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password || '');
};

export const User = mongoose.model('User', UserSchema);
export default User;
