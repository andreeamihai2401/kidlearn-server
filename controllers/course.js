import AWS, { AlexaForBusiness } from "aws-sdk";
import { nanoid } from "nanoid";
import Course from "../models/course";
import User from "../models/user";
import slugify from "slugify";
import { readFileSync } from "fs";
import Completed from "../models/completed";
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const awsConfig = {
  accesKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);

export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).send("No image");

    //prepare the image
    const base64Data = new Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const type = image.split(";")[0].split("/")[1];

    //image params
    const params = {
      Bucket: "kidlearn-bucket",
      Key: `${nanoid()}.${type}`,
      Body: base64Data,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };

    //upload to S3
    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.sendStatus(400);
      }
      console.log(data);
      res.send(data);
    });
  } catch (err) {
    console.log(err);
  }
};

export const removeImage = async (req, res) => {
  try {
    const { image } = req.body;
    const params = {
      Bucket: image.Bucket,
      Key: image.Key,
    };
    //send remove req to s3
    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      res.send({ ok: true });
    });
  } catch (err) {
    console.log(err);
  }
};

export const create = async (req, res) => {
  try {
    const alreadyExist = await Course.findOne({
      slug: slugify(req.body.name.toLowerCase()),
    });
    if (alreadyExist) return res.status(400).send("Title is taken");

    const course = await new Course({
      slug: slugify(req.body.name),
      instructor: req.auth._id,
      ...req.body,
    }).save();

    res.json(course);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Course create failed. Try again");
  }
};

export const read = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate("instructor", "_id name")
      .exec();
    res.json(course);
  } catch (err) {
    console.log(err);
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (req.auth._id != req.params.instructorId) {
      return res.status(400).send("Unauthorized");
    }

    const { file } = req.files;

    if (!file) return res.status(400).send("No file");

    const params = {
      Bucket: "kidlearn-bucket",
      Key: `${nanoid()}.${file.type.split("/")[1]}`,
      Body: readFileSync(file.path),
      ACL: "public-read",
      ContentType: file.type,
    };

    //upload to S3
    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      console.log(data);
      res.send(data);
    });
  } catch (err) {
    console.log(err);
  }
};

export const removeFile = async (req, res) => {
  try {
    if (req.auth._id != req.params.instructorId) {
      return res.status(400).send("Unauthorized");
    }

    const { Bucket, Key } = req.body;

    const params = {
      Bucket,
      Key,
    };

    //delete from S3
    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      console.log(data);
      res.send({ ok: true });
    });
  } catch (err) {
    console.log(err);
  }
};

export const addLesson = async (req, res) => {
  try {
    const { slug, instructorId } = req.params;
    const { title, content, file } = req.body;

    if (req.auth._id != instructorId) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      {
        $push: { lessons: { title, content, file, slug: slugify(title) } },
      },
      { new: true }
    )
      .populate("instructor", "id name")
      .exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Add lesson failed");
  }
};

export const addQuiz = async (req, res) => {
  try {
    const { slug, instructorId } = req.params;
    const quizData = req.body;

    if (req.auth._id != instructorId) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate(
      { slug },
      {
        $push: {
          quizzes: {
            questions: quizData.map(
              ({ question, options, correctOptionIndex }) => ({
                question,
                options,
                correctOptionIndex,
              })
            ),
          },
        },
      },
      { new: true }
    )
      .populate("instructor", "id name")
      .exec();

    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Add quiz failed");
  }
};

export const update = async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await Course.findOne({ slug }).exec();

    if (req.auth._id != course.instructor) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate({ slug }, req.body, {
      new: true,
    }).exec();

    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send(err.message);
  }
};

export const removeLesson = async (req, res) => {
  const { slug, lessonId } = req.params;
  const course = await Course.findOne({ slug }).exec();
  if (req.auth._id != course.instructor) {
    return res.status(400).send("Unauthorized");
  }

  const deletedCourse = await Course.findByIdAndUpdate(course._id, {
    $pull: { lessons: { _id: lessonId } },
  }).exec();

  res.json({ ok: true });
};

export const removeQuiz = async (req, res) => {
  const { slug, quizId } = req.params;
  const course = await Course.findOne({ slug }).exec();
  if (req.auth._id != course.instructor) {
    return res.status(400).send("Unauthorized");
  }

  const deletedCourse = await Course.findByIdAndUpdate(course._id, {
    $pull: { quizzes: { _id: quizId } },
  }).exec();

  res.json({ ok: true });
};

export const updateLesson = async (req, res) => {
  try {
    const { slug } = req.params;
    const { _id, title, content, file, free_preview } = req.body;
    const course = await Course.findOne({ slug }).select("instructor").exec();

    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.updateOne(
      { "lessons._id": _id },
      {
        $set: {
          "lessons.$.title": title,
          "lessons.$.content": content,
          "lessons.$.file": file,
          "lessons.$.free_preview": free_preview,
        },
      },
      { new: true }
    ).exec();

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Update lesson failed");
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { slug, quizId } = req.params;
    const { questions } = req.body;

    const course = await Course.findOne({ slug }).select("instructor").exec();

    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate(
      { slug, "quizzes._id": quizId },
      {
        $set: {
          "quizzes.$.questions": questions.map(
            ({ question, options, correctOptionIndex }) => ({
              question,
              options,
              correctOptionIndex,
            })
          ),
        },
      },
      { new: true }
    )
      .populate("instructor", "id name")
      .exec();

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Update quiz failed");
  }
};

export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      {
        published: true,
      },
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Publish course failed!");
  }
};

export const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    if (course.instructor._id != req.auth._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      {
        published: false,
      },
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Unpublish course failed!");
  }
};

export const courses = async (req, res) => {
  const all = await Course.find({ published: true })
    .populate("instructor", "_id name")
    .exec();

  res.json(all);
};

export const checkEnrollment = async (req, res) => {
  const { courseId } = req.params;
  //find courses of the current logged in user
  const user = await User.findById(req.auth._id).exec();
  //check if course id is found in user courses array
  let ids = [];
  let length = user.courses && user.courses.length;
  for (let i = 0; i < length; i++) {
    ids.push(user.courses[i].toString());
  }
  res.json({
    status: ids.includes(courseId),
    course: await Course.findById(courseId).exec(),
  });
};

export const freeEnrollment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).exec();
    if (course.paid) return;
    const result = await User.findByIdAndUpdate(
      req.auth._id,
      {
        $addToSet: { courses: course._id },
      },
      { new: true }
    ).exec();
    res.json({
      message: "Congratulations! You have successfully enrolled.",
      course,
    });
  } catch (err) {
    console.log("free enrollment err", err);
    return res.status(400).send("Enrollment create failed");
  }
};

export const paidEnrollment = async (req, res) => {
  try {
    // check if course is free or paid
    const course = await Course.findById(req.params.courseId)
      .populate("instructor")
      .exec();
    if (!course.paid) return;
    //application fee 30%
    const fee = (course.price * 30) / 100;
    //create stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      //purchase details
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: course.name,
            },
            unit_amount: Math.round(course.price.toFixed(2) * 100),
          },
          quantity: 1,
        },
      ],
      //charge buyer and tranfer remaining balance to seller (after fee)
      payment_intent_data: {
        application_fee_amount: Math.round(fee.toFixed(2) * 100),
        transfer_data: {
          destination: course.instructor.stripe_account_id,
        },
      },
      //redirect url after successful payment
      success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });
    console.log("Session id =>", session);

    await User.findByIdAndUpdate(req.auth._id, {
      stripeSession: session,
      $addToSet: { courses: course._id },
    }).exec();
    res.send(session.id);
  } catch (err) {
    console.log("PAID ENROLLMENT ERR", err);
    return res.status(400).send("Enrollment create failed");
  }
};

export const stripeSuccess = async (req, res) => {
  try {
    //find course
    const course = await Course.findById(req.params.courseId).exec();
    // get user from db to get stripe session id
    const user = await User.findById(req.auth._id).exec();
    //if no stripe session return
    if (!user.stripeSession.id) return res.sendStatus(400);
    //retrieve strpe session
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );
    console.log("STRIPE SUCCESS", session);
    //if session payment is paid, push course to user s course []
    if (session.payment_status === "paid") {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { course: course._id },
        $set: { stripeSession: {} },
      }).exec();
    }
    res.json({ success: true, course });
  } catch (err) {
    console.log("STRIPE SUCCESS ERR", err);
    res.json({ success: false });
  }
};

export const userCourses = async (req, res) => {
  const user = await User.findById(req.auth._id).exec();
  const courses = await Course.find({ _id: { $in: user.courses } })
    .populate("instructor", "_id name")
    .exec();
  res.json(courses);
};

export const markCompleted = async (req, res) => {
  const { courseId, lessonId } = req.body;

  const existing = await Completed.findOne({
    user: req.auth._id,
    course: courseId,
  }).exec();
  console.log(existing, req.auth._id, courseId, lessonId);

  if (existing) {
    const updated = await Completed.findOneAndUpdate(
      {
        user: req.auth._id,
        course: courseId,
      },
      {
        $addToSet: { lessons: lessonId },
      }
    ).exec();
    res.json({ ok: true });
  } else {
    const created = await new Completed({
      user: req.auth._id,
      course: courseId,
      lessons: lessonId,
    }).save();
    res.json({ ok: true });
  }
};

export const listCompleted = async (req, res) => {
  try {
    const list = await Completed.findOne({
      user: req.auth._id,
      course: req.body.courseId,
    }).exec();
    list && res.json(list.lessons);
  } catch (err) {
    console.log(err);
  }
};

export const markIncomplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    const updated = await Completed.findOneAndUpdate(
      {
        user: req.auth._id,
        course: courseId,
      },
      {
        $pull: { lessons: lessonId },
      }
    ).exec();
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};
