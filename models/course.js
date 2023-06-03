import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema;

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      minlenght: 3,
      maxlenght: 320,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
    },
    content: {
      type: {},
      minlength: 200,
    },
    file: {},
    free_preview: {
      type: Boolean,
      default: false,
    },
    contentType: {
      type: String,
      enum: ["lesson"],
      default: "lesson",
    },
  },
  { timestamps: true }
);

const quizSchema = new mongoose.Schema(
  {
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        options: [
          {
            type: String,
            required: true,
          },
        ],
        correctOptionIndex: {
          type: Number,
          required: true,
        },
      },
    ],
    contentType: {
      type: String,
      enum: ["quiz"],
      default: "quiz",
    },
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlenght: 3,
      maxlenght: 320,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: {},
      minlength: 200,
      required: true,
    },
    price: {
      type: Number,
      default: 9.99,
    },
    image: {},
    category: String,
    published: {
      type: Boolean,
      default: false,
    },
    paid: {
      type: Boolean,
      default: true,
    },
    instructor: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    lessons: [lessonSchema],
    quizzes: [quizSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Course", courseSchema);
