const router = require("express").Router();
const dotenv = require("dotenv");
dotenv.config();

const axios = require("axios");

const contractABI = require("../contractABI");
const contractByteCode = require("../contractByteCode");

const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({ extended: true }));

let { Web3, Contract } = require("web3");
let provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
Web3 = new Web3(provider);

const { NFTStorage, File } = require("nft.storage");
const client = new NFTStorage({
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDEzMjE0MjUwZjRmZGE5NmJDQkIwNjlCNzdjMWViQTA2ZWE0MzBENDgiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTcxMDAzMjI4NjAxOSwibmFtZSI6Ik5vdmFMYWJzIn0.Qab0amdmod3Tn7dB2tw_1KQ0CJ70weHDED6a2_NQGxU",
});

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

const createNFTs = async (
  setupData,
  userContract,
  description,
  image,
  metaMaskAddress
) => {
  try {
    image = await fetch(image);
    image = await image.blob();

    setupData.forEach(async (setup) => {
      let names = setup.names.split(",");

      names.forEach(async (name) => {
        const metadata = {
          name: name, // Assuming you have a 'name' property in your 'setup' object
          image: new File([image], `${name}.jpg`, {
            type: "image/jpg",
          }),
          description,
          value: setup.value, // Assuming you have a 'value' property in your 'setup' object
        };

        const specificMetadata = await client.store(metadata);
        const tokenCount = await userContract.methods.tokenCount().call(); // Await the result

        userContract.methods
          .safeMint(
            metaMaskAddress,
            tokenCount,
            specificMetadata.url,
            metadata.value
          )
          .send({ from: metaMaskAddress }) // Assuming 'from' is the MetaMask address
          .on("transactionHash", (hash) => {
            console.log("Transaction hash:", hash);
          })
          .on("confirmation", (confirmationNumber, receipt) => {
            if (confirmationNumber === 1) {
              console.log("NFT minted:", receipt);
            }
          })
          .on("error", (error) => {
            console.error("Error minting NFT:", error);
          });
      });
    });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
};

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
        throw new Error("Error Occured");
      });
  } catch (err) {
    res.status(500).json("Error Occured");
  }
});

router.post("/setupAsset", async (req, res) => {
  try {
    const { assetId, setupData } = req.body;

    const assetDB = db.collection("Assets");
    const assetDoc = assetDB.doc(assetId);

    let description;
    let image =
      "https://res.cloudinary.com/dzufrvi5k/image/upload/v1710062771/Rectangle_17_isiuzm.jpg";
    let nfts;
    let userId;
    let userContract;
    let metaMaskAddress;

    await assetDoc
      .get()
      .then((docSnapshot) => {
        if (docSnapshot.exists) {
          description = docSnapshot.data().assetDescription;
          image =
            "https://res.cloudinary.com/dzufrvi5k/image/upload/v1710062771/Rectangle_17_isiuzm.jpg";
          nfts = docSnapshot.data().nfts || [];
          userId = docSnapshot.data().userId;

          // console.log(description, image, nfts, userId);

          return Promise.resolve();
        } else {
          console.log("Document does not exist.");
          return Promise.reject();
        }
      })
      .catch((err) => {
        throw new Error("Asset does not exists!");
      });

    const userDB = db.collection("Users");

    const userDoc = userDB.doc(`${userId}`);

    // Check if the user exists
    await userDoc
      .get()
      .then(async (docSnapshot) => {
        if (
          (docSnapshot.exists &&
            docSnapshot.data().userContract != undefined) ||
          docSnapshot.data().userContract != ""
        ) {
          // Deploy contract once for the user
          metaMaskAddress = docSnapshot.data().metaMaskAddress;
          // Deploy the contract
          const deployedContract = await new Web3.eth.Contract(contractABI)
            .deploy({
              data: contractByteCode,
              arguments: [1],
            })
            .send({
              from: metaMaskAddress,
            });

          const contractAddress = deployedContract.options.address;

          // Create an instance of the contract
          const userContract = new Web3.eth.Contract(
            contractABI,
            contractAddress
          );

          // Instead of converting the contract instance to JSON, store relevant information
          await userDoc
            .set({
              userContract: JSON.stringify({
                address: userContract.options.address,
                abi: contractABI,
              }),
            })
            .catch((err) => {
              throw new Error("Error occurred");
            });

          return Promise.resolve({ userContract });
        } else {
          userContract = await docSnapshot.data().userContract;
          return Promise.resolve({ userContract });
        }
      })
      .then(async ({ userContract }) => {
        await createNFTs(
          setupData,
          userContract,
          description,
          image,
          metaMaskAddress
        )
          .then((data) => {
            console.log(data);
          })
          .catch((err) => console.log(err));
      })
      .catch((error) => {
        throw new Error(error);
      });

    res.status(200).json("Success");
  } catch (err) {
    console.log(err);
    res.status(500).json("Error Occured");
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const userDB = db.collection("Users");
    const userDocs = await userDB.get();

    const notifications = [];

    userDocs.forEach((doc) => {
      if (
        doc.data().notifications != undefined &&
        doc.data().notifications != [] &&
        doc.data().notifications != ""
      )
        notifications.push(...doc.data().notifications);
    });

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json("Error Occured");
  }
});

module.exports = router;
