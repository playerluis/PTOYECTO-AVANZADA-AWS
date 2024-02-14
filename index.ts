import express from 'express';
import {Server} from 'node:http';
import cors from "./cors";
import accountRoute from "./routes/AccountController";

const app = express();
const server = new Server(app);
const port: number = 3000;

app.use(express.json());
app.use(cors);
app.use(accountRoute);
//use static files
app.use(express.static('static'));

server.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

