import express from 'express';
import {Server} from 'node:http';
import cors from "./cors";
import accountRoute from "./routes/AccountController";
import fileUpload from "express-fileupload";

const app = express();
const server = new Server(app);
const port: number = 8080;

app.use(fileUpload())
app.use(express.json());
app.use(cors);
app.use(accountRoute);
app.use(express.static('static'));

app.get('*', (_, res) => {
	res.sendFile('index.html', {root: 'static'});
});

server.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

