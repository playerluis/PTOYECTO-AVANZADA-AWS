import {NextFunction, Request, Response} from "express";

const cors = (_: Request, res: Response, next: NextFunction) => {
	
	console.log('CORS middleware');
	
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	
	next();
}

export default cors;