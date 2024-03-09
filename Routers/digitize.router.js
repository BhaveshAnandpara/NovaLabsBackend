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

router.post("/registerAsset", async (req, res) => {
  try {
    const {
      userId,
      assetImage,
      assetName,
      assetCategory,
      assetDescription,
      layoutPlan,
      ownerShipDocs,
      otherDocs,
    } = req.body;
    const newAsset = {
      userId,
      assetImage,
      assetName,
      assetCategory,
      assetDescription,
      layoutPlan,
      ownerShipDocs,
      otherDocs,
      status: "Pending",
      assetToken: null,
    };

    console.log(
      userId,
      assetImage,
      assetName,
      assetCategory,
      assetDescription,
      layoutPlan,
      ownerShipDocs,
      otherDocs
    );

    const assetDB = db.collection("Assets");
    await assetDB.add(newAsset);

    const userDB = db.collection("Users");
    const userDoc = userDB.doc(userId);

    const notificationToAdd =
      "Asset has been sent for Verification. Status is PENDING.";

    // Fetch the current 'notifications' array
    userDoc
      .get()
      .then((docSnapshot) => {
        if (docSnapshot.exists) {
          // Extract the current array or initialize it if not present
          const currentNotifications = docSnapshot.data().notifications || [];
          const updatedNotifications = [
            ...currentNotifications,
            notificationToAdd,
          ];
          userDoc.update({ notifications: updatedNotifications });

          return Promise.resolve();
        } else {
          console.log("Document does not exist.");
          return Promise.resolve();
        }
      })
      .then(() => {
        res.status(200).json("Asset has been sent for Verification");
      })
      .catch((error) => {
        res.status(500).json("Error Occured");
      });
  } catch (err) {
    res.status(500).json("Error Occured");
  }
});

router.post("/validateAsset", async (req, res) => {
  try {
    const { assetId, decesion } = req.body;

    const assetDB = db.collection("Assets");
    const assetDoc = assetDB.doc(assetId);

    let userId;

    // Fetch the current 'notifications' array
    assetDoc
      .get()
      .then((docSnapshot) => {
        if (docSnapshot.exists) {
          userId = docSnapshot.data().userId;
          assetDoc.update({ status: decesion });
          return Promise.resolve();
        } else {
          console.log("Document does not exist.");
          return Promise.resolve();
        }
      })
      .then(() => {
        const userDB = db.collection("Users");
        const userDoc = userDB.doc(userId);

        const notificationToAdd = `Asset has been ${decesion}. Status is ${decesion}.`;

        // Fetch the current 'notifications' array
        userDoc.get().then((docSnapshot) => {
          if (docSnapshot.exists) {
            // Extract the current array or initialize it if not present
            const currentNotifications = docSnapshot.data().notifications || [];
            const updatedNotifications = [
              ...currentNotifications,
              notificationToAdd,
            ];
            userDoc.update({ notifications: updatedNotifications });

            return Promise.resolve();
          } else {
            console.log("Document does not exist.");
            return Promise.resolve();
          }
        });
      })
      .then(() => {
        res.status(200).json(`Asset requet has been ${decesion}`);
      })
      .catch((error) => {
        res.status(500).json("Error Occured");
      });
  } catch (err) {
    res.status(500).json("Error Occured");
  }
});

module.exports = router;
