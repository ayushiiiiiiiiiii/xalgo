import mongoose, { Schema } from 'mongoose';

const MatchSchema = new Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    problemId: {
      type: Schema.Types.ObjectId,
      ref: 'Problem',
      required: true
    },
    host: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      durationTaken: {
        type: Number,
        default: null
      },
      progress: {
        type: Number,
        default: 0
      },
      codeSubmitted: {
        type: String,
        default: ''
      }
    },
    guest: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      durationTaken: {
        type: Number,
        default: null
      },
      progress: {
        type: Number,
        default: 0
      },
      codeSubmitted: {
        type: String,
        default: ''
      }
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACTIVE', 'RESOLVED'],
      default: 'OPEN',
      required: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Match = mongoose.model('Match', MatchSchema);
export default Match;
