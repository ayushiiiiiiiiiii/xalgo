import mongoose, { Schema } from 'mongoose';

const ProblemSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true
    },
    boilerplateCode: {
      type: Map,
      of: String,
      required: true,
      default: new Map()
    },
    testCases: [
      {
        input: {
          type: String,
          required: true
        },
        expectedOutput: {
          type: String,
          required: true
        },
        isPrivate: {
          type: Boolean,
          required: true,
          default: false
        }
      }
    ],
    testHarness: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

export const Problem = mongoose.model('Problem', ProblemSchema);
export default Problem;
