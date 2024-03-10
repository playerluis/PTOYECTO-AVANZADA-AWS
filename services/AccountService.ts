import {Collection, Db, MongoClient, GridFSBucket, ObjectId, GridFSFile, GridFSBucketReadStream} from "mongodb";
import Account, {AccountDto} from "../models/Account";
import EmailSender from "./EmailSender";
import {ApprovedAccountEmail, FirstApproveEmail, NewAccountEmail, RejectedEmail} from "../emails/EmailsHtml";
import {UploadedFile} from "express-fileupload";

const uri: string = 'mongodb://localhost:27017'; // por defecto, MongoDB se ejecuta en el puerto 27017
const dbName: string = 'test'; // Nombre de la base de datos
const collectionName: string = 'users'; // Nombre de la colección

const mailsender = new EmailSender();

async function connectToDatabase(): Promise<MongoClient> {
	try {
		const client: MongoClient = new MongoClient(uri);
		await client.connect();
		console.log('Conectado correctamente a la base de datos');
		return client;
	} catch (error) {
		console.error('Error al conectar a la base de datos:', error);
		throw error;
	}
}


async function catchPipeline(client: MongoClient, func: () => Promise<void>, onError?: (error: Error) => void): Promise<void> {
	
	let error: Error | undefined;
	const errorCatch = (err: Error) => {
		console.error('Error en la pipeline:', err);
		if (onError) onError(err);
		else error = err;
	}
	
	await func()
	.catch(errorCatch)
	.finally(client.close);
	
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
		await collection.insertOne(account);
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
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		if (existingAccount.firstApprove) {
			throw new Error('La cuenta ya ha sido aprobada.');
		}
		await collection.updateOne({id}, {$set: {firstApprove: true}});
		await mailsender.sendHtml(existingAccount.email, 'Primera fase de aprobación de cuenta bancaria', FirstApproveEmail(existingAccount));
	});
}

export async function permitUploadPicture(id: string): Promise<boolean> {
	
	const client = await connectToDatabase();
	
	let result = false;
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({id});
		
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		
		result = existingAccount.firstApprove && !existingAccount.secondApprove;
	});
	
	return result;
}

export async function uploadPicture(file: UploadedFile, id: string): Promise<void> {
	
	const client = await connectToDatabase();
	
	await catchPipeline(client, async () => {
		
		const db: Db = client.db(dbName);
		const bucket = new GridFSBucket(db, {bucketName: 'ciPictures'});
		const collection: Collection = db.collection(collectionName);
		const existingAccount = await collection.findOne<Account>({id});
		
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
		
		const bytes = file.data;
		const uploadStream = bucket.openUploadStream(file.name, {
			metadata: {
				accountId: id,
				uploadDate: new Date().toISOString(),
				contentType: file.mimetype,
				size: file.size
			} as Metadata
		});
		
		uploadStream.write(bytes, (err) => {
			if (err) throw err;
		});
		uploadStream.end();
		await collection.updateOne({id}, {$set: {pictureId: uploadStream.id}});
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
		const existingAccount = await collection.findOne<Account>({id});
		if (!existingAccount) {
			throw new Error('No existe una cuenta con ese id.');
		}
		if (!existingAccount.firstApprove) {
			throw new Error('La cuenta aun no ha sido aprobada en la primera fase, espere a que le llegue un correo.');
		}
		if (existingAccount.secondApprove) {
			throw new Error('La cuenta ya ha sido aprobada por completo.');
		}
		await collection.updateOne({id}, {$set: {secondApprove: true}});
		await mailsender.sendHtml(existingAccount.email, 'Cuenta bancaria aprobada', ApprovedAccountEmail());
	});
}

export function getPictureStream(id: string): Promise<[GridFSBucketReadStream, Metadata]> {
	
	return new Promise(async (resolve, reject) => {
		
		const client = await connectToDatabase();
		
		await catchPipeline(client, async () => {
			
			const db: Db = client.db(dbName);
			const bucket = new GridFSBucket(db, {bucketName: 'ciPictures'});
			const objectId = new ObjectId(id);
			
			const stream: GridFSBucketReadStream = bucket.openDownloadStream(objectId);
			const file: GridFSFile[] = await bucket.find({_id: objectId}).toArray();
			
			if (!file || file.length === 0) {
				throw new Error('No existe una imagen con ese id');
			}
			
			const fileMetadata = file[0].metadata;
			if (!fileMetadata) {
				throw new Error('No existe metadata para la imagen');
			}
			
			const metadata: Metadata = {
				accountId: fileMetadata.accountId,
				uploadDate: fileMetadata.uploadDate,
				contentType: fileMetadata.contentType,
				size: fileMetadata.size,
				originalName: file[0].filename
			};
			
			
			resolve([stream, metadata]);
			
		}, reject);
		
	});
	
}

export interface Metadata {
	accountId: string;
	uploadDate: string;
	contentType: string;
	size: number;
	originalName?: string;
}