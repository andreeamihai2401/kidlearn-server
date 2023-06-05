import express from "express";
import formidable from "express-formidable";

const router = express.Router();

//controllers
import {
  uploadImage,
  removeImage,
  create,
  read,
  uploadFile,
  removeFile,
  addLesson,
  update,
  removeLesson,
  updateLesson,
  publishCourse,
  unpublishCourse,
  courses,
  checkEnrollment,
  freeEnrollment,
  paidEnrollment,
  stripeSuccess,
  userCourses,
  markCompleted,
  listCompleted,
  markIncomplete,
  addQuiz,
  removeQuiz,
  updateQuiz,
} from "../controllers/course";

//middlewares
import { isInstructor, requireSignin, isEnrolled } from "../middlewares";

router.get("/courses", courses);

//image
router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

//course
router.post("/course", requireSignin, isInstructor, create);
router.put("/course/:slug", requireSignin, update);

router.get("/course/:slug", read);
router.post(
  "/course/file-upload/:instructorId",
  requireSignin,
  formidable({ maxFileSize: 500 * 1024 * 1024 }),
  uploadFile
);
router.post("/course/file-remove/:instructorId", requireSignin, removeFile);

//publish/unpublish course
router.put("/course/publish/:courseId", requireSignin, publishCourse);
router.put("/course/unpublish/:courseId", requireSignin, unpublishCourse);

//lesson
router.post("/course/lesson/:slug/:instructorId", requireSignin, addLesson);
router.put("/course/lesson/:slug/:instructorId", requireSignin, updateLesson);
router.put("/course/:slug/:lessonId", requireSignin, removeLesson);

//quiz
router.post("/course/quiz/:slug/:instructorId", requireSignin, addQuiz);
router.put("/course/quiz/:slug/:quizId", requireSignin, updateQuiz);
router.put("/course/:slug/quiz/:quizId", requireSignin, removeQuiz);

router.get("/check-enrollment/:courseId", requireSignin, checkEnrollment);

//enrollment
router.post("/free-enrollment/:courseId", requireSignin, freeEnrollment);
router.post("/paid-enrollment/:courseId", requireSignin, paidEnrollment);
router.get("/stripe-success/:courseId", requireSignin, stripeSuccess);

router.get("/user-courses", requireSignin, userCourses);
router.get("/user/course/:slug", requireSignin, isEnrolled, read);

// mark completed
router.post("/mark-completed", requireSignin, markCompleted);
router.post("/mark-incomplete", requireSignin, markIncomplete);
router.post("/list-completed", requireSignin, listCompleted);
module.exports = router;
