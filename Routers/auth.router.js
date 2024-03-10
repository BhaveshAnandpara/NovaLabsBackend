const router = require("express").Router();
const dotenv = require("dotenv");
dotenv.config();

const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({ extended: true }));

const admin = require("firebase-admin");
const db = require("../db");

const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  onChildChanged,
  child,
  update,
} = require("firebase/database");

router.post("/saveUser", async (req, res) => {
  try {
    const { userId , userEmail } = req.body;

    const userDB = db.collection("Users");
    const userDoc = userDB.doc(userId);

    // Check if the user exists
    userDoc
      .get()
      .then((docSnapshot) => {
        if (!docSnapshot.exists) {
          userDoc
            .set({ email: userEmail, notifications: [] })
            .then(() => {
              console.log("New user document created with userId:", userId);
              res.status(200).json("Account Created Successfully");
            })
            .catch((error) => {
              console.error("Error creating new user document:", error);
              res.status(500).json("Error Occured");
            });
        }else{
            console.error("Already Exists");
            res.status(200).json("Already Exists");
        }
      })
      .catch((error) => {
        console.error("Error checking user existence:", error);
        res.status(500).json("Error Occured");    
      });
  } catch (err) {
    res.status(500).json("Error Occured");
  }
});


module.exports = router;
