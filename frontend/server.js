// simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

//npm install dotenv - para instalar
dotenv.config();  // Carrega as variáveis de ambiente do arquivo .env

const app = express();
app.use(express.static(path.join(__dirname, "build")));
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
