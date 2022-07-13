import dotenv from "dotenv";
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from "path";
import router from "./routes";
import { session } from "./middlewares/session.middleware";
import { createCodeChallenge } from "./middlewares/createCodeChanlenge.middleware";

dotenv.config({ path: path.resolve('.env')});

const PORT = process.env.PORT || 3006;
const app = express();

// Seting 
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, './views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.resolve('public')));

// Session + Create Code Challenge middleware
app.use(session, createCodeChallenge);

// Routing
app.use(router());

app.listen(PORT, () => {
  console.log(
    `App listening on port ${PORT}, check http://localhost:${PORT}`
  );
});
