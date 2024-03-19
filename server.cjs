const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static(path.join(__dirname, "dist")));

app.post("/upload", upload.single("file"), async (req, res) => {
  const targetPath = path.join(setFolderPath, req.file.originalname);

  try {
    await fs.rename(req.file.path, targetPath);
    res.send("File saved successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving file.");
  }
});

app.listen(3001, () => {
  console.log("Server listening on port 3001");
});
