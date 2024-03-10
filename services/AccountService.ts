import Account, {newAccountFromDto} from "../models/Account";
import EmailSender from "./EmailSender";
import {ApprovedAccountEmail, FirstApproveEmail, NewAccountEmail, RejectedEmail} from "../emails/EmailsHtml";
import {AccountDto} from "../models/AccountDto";

import {Collection, Db, MongoClient, ObjectId} from "mongodb";
import {GridFSBucket, GridFSBucketReadStream, GridFSFile} from "mongodb";
import {UploadedFile} from "express-fileupload";
import {Readable} from "node:stream";

const dbName = 'bank';
const collectionName = 'accounts';
const url = 'mongodb://localhost:27017';

const mailsender = new EmailSender();

export async function connectToDatabase(): Promise<MongoClient> {
	try {
		const client = new MongoClient(url);
		await client.connect();
		return client;
	} catch (error) {
		throw new Error('Error al conectar con la base de datos');
	}
}

async function uploadFileToMongo(file: Readable, filename: string, metadata: Metadata, filetype: string, id: ObjectId | undefined = undefined): Promise<ObjectId> {
	
	const client = await connectToDatabase();
	const db: Db = client.db(dbName);
	
	let bucket = new GridFSBucket(db);
	
	const streamOpts = {metadata: metadata, contentType: filetype};
	let uploadStream = id ? bucket.openUploadStreamWithId(id, filename, streamOpts) : bucket.openUploadStream(filename, streamOpts)
	
	await new Promise<void>((resolve, reject) => {
		file.pipe(uploadStream)
		.on('finish', resolve)
		.on('error', reject);
	});
	
	await client.close();
	return uploadStream.id;
}

async function catchPipeline(client: MongoClient, func: () => Promise<void>, onError?: (err: Error) => void): Promise<void> {
	
	let error: Error | undefined;
	const errorCatch = (err: Error) => {
		console.error('Error en la pipeline:', err);
		if (onError) onError(err);
		else error = err;
	}
	
	await func()
	.catch(errorCatch)
	.finally(() => client.close()); // Envuelve client.close en una función de retorno de llamada
	
	if (error) throw error;
	
}

export async function saveAccount(account: AccountDto): Promise<void> {
	
	const client = await connectToDatabase();
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({ci: account.ci});
		if (existingAccount) {
			if (existingAccount.firstApprove && existingAccount.secondApprove) {
				throw new Error('Ya existe una cuenta con el mismo número de cédula y ya ha sido aprobada.');
			}
			if (existingAccount.firstApprove) {
				throw new Error('Ya existe una cuenta en fase de aprobacion con ese numero de cedula');
			}
			throw new Error('Ya existe una cuenta con el mismo número de cédula.');
		}
		await collection.insertOne(newAccountFromDto(account));
		await mailsender.sendHtml(account.email, 'Cuenta bancaria solicitada', NewAccountEmail(account))
	});
}

export async function rejectAccount(id: string, reason: string): Promise<void> {
	
	const client = await connectToDatabase();
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({id});
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		if (existingAccount.firstApprove && existingAccount.secondApprove) {
			throw new Error('La cuenta ya ha sido aprobada.');
		}
		await mailsender.sendHtml(existingAccount.email, 'Cuenta bancaria rechazada', RejectedEmail({id, reason}));
		await collection.deleteOne({id});
		
	});
}

export async function approveAccountFirst(id: string): Promise<void> {
	
	const client = await connectToDatabase();
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({id});
		console.log(existingAccount);
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		if (existingAccount.firstApprove) {
			throw new Error('La cuenta ya ha sido aprobada.');
		}
		const _id = existingAccount._id.toString();
		console.log(_id);
		await collection.updateOne({id}, {$set: {firstApprove: true}});
		await mailsender.sendHtml(existingAccount.email, 'Primera fase de aprobación de cuenta bancaria', FirstApproveEmail(_id));
	});
}

export async function permitUploadPicture(id: string): Promise<boolean> {
	
	const client = await connectToDatabase();
	
	let result = false;
	
	await catchPipeline(client, async () => {
		
		console.log('Permit picture: ', id);
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({_id: new ObjectId(id)});
		
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		
		result = existingAccount.firstApprove && !existingAccount.secondApprove;
	});
	
	return result;
}

export async function uploadPicture(file: UploadedFile, id: string): Promise<void> {
	console.log('Upload picture: ', id);
	const client: MongoClient = await connectToDatabase();
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({_id: new ObjectId(id)});
		
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		if (existingAccount.pictureId) {
			throw new Error('Ya se ha subido una foto de la cédula de identidad.');
		}
		if (!existingAccount.firstApprove) {
			throw new Error('La cuenta no ha sido aprobada en la primera fase.');
		}
		if (existingAccount.secondApprove) {
			throw new Error('La cuenta ya ha sido aprobada.');
		}
		
		const metadata: Metadata = {
			accountId: id,
			uploadDate: new Date().toISOString(),
			contentType: file.mimetype,
			size: file.size
		};
		
		const fileStream = new Readable();
		fileStream.push(file.data);
		fileStream.push(null);
		
		const objectId = await uploadFileToMongo(fileStream, file.name, metadata, file.mimetype);
		console.log('Id de la imagen:', objectId);
		
		await collection.updateOne({_id: new ObjectId(id)}, {$set: {pictureId: objectId}});
	});
}

export async function getAccounts(): Promise<Account[]> {
	
	const client = await connectToDatabase();
	
	let result: Account[] = [];
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const cursor = collection.find<Account>({});
		result = await cursor.toArray();
		
	});
	
	return result;
}

export async function getNewAccounts(): Promise<Account[]> {
	
	const client = await connectToDatabase();
	
	let result: Account[] = [];
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const cursor = collection.find<Account>({firstApprove: false});
		result = await cursor.toArray();
		
	});
	
	return result;
}

export async function getAccountsPendingIdentity(): Promise<Account[]> {
	
	const client = await connectToDatabase();
	
	let result: Account[] = [];
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const cursor = collection.find<Account>({firstApprove: true, secondApprove: false, pictureId: {$exists: false}});
		result = await cursor.toArray();
		
	});
	
	return result;
}

export async function approveIdentity(id: string): Promise<void> {
	
	const client = await connectToDatabase();
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({_id: new ObjectId(id)});
		
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		if (!existingAccount.firstApprove) {
			throw new Error('La cuenta aun no ha sido aprobada en la primera fase, espere a que le llegue un correo.');
		}
		if (existingAccount.secondApprove) {
			throw new Error('La cuenta ya ha sido aprobada por completo.');
		}
		await collection.updateOne({_id: new ObjectId(id)}, {$set: {secondApprove: true}});
		await mailsender.sendHtml(existingAccount.email, 'Cuenta bancaria aprobada', ApprovedAccountEmail());
	});
}

export function getPictureStream(id: string, writeStream: NodeJS.WritableStream, metadataResolver: (metadata: Metadata) => void): Promise<void> {
	
	return new Promise(async (resolve, reject) => {
		
		try {
			
			const client = await connectToDatabase();
			const db: Db = client.db(dbName);
			const bucket = new GridFSBucket(db);
			
			if (!ObjectId.isValid(id)) {
				reject('No se econtró una imagen con ese id');
				return;
			}
			
			const filesResults = await bucket.find({_id: new ObjectId(id)}).toArray();
			if (filesResults.length === 0) {
				reject('No se econtró una imagen con ese id');
				return;
			}
			
			const file: GridFSFile = filesResults[0];
			metadataResolver(file.metadata as Metadata);
			
			const stream: GridFSBucketReadStream = bucket.openDownloadStream(new ObjectId(id));
			
			stream.on('end', () => {
				resolve();
				client.close();
			});
			
			stream.on('error', (err) => {
				reject(err);
				client.close();
			});
			
			stream.pipe(writeStream);
		} catch (error) {
			reject(error);
		}
	});
	
}

export interface Metadata {
	accountId: string;
	uploadDate: string;
	contentType: string;
	size: number;
	originalName?: string;
}