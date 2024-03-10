import {Router} from 'express';
import Account from '../models/Account';
import RejectData from "../models/RejectData";
import {approveAccountFirst, approveIdentity, getAccounts, getAccountsPendingIdentity, getNewAccounts, getPictureStream, permitUploadPicture, rejectAccount, saveAccount, uploadPicture} from "../services/AccountService";
import {Response} from "express-serve-static-core";
import {UploadedFile} from "express-fileupload";
import {AccountDto} from "../models/AccountDto";

const router = Router();

function sendError(res: Response, error: Error | unknown): void {
	if (error instanceof Error) {
		console.log(error.message);
		res.status(401).send({message: error.message});
	} else if ('string' === typeof error) {
		console.log(error);
		res.status(401).send({message: error});
	} else {
		console.log(error);
		res.status(500).send({message: 'Error desconocido'});
	}
}

router.post('/account/new', async (req, res) => {
	console.log('New account');
	try {
		const account: AccountDto = req.body;
		await saveAccount(account);
		res.status(200).send({message: 'Cuenta solicitada con exito, espere aprobacion, este pendiente de su correo'});
	} catch (error) {
		sendError(res, error);
	}
});

router.post('/account/reject', async (req, res) => {
	console.log('Reject account');
	try {
		const data: RejectData = req.body;
		await rejectAccount(data.id, data.reason);
		res.status(200).send({message: 'Cuenta rechazada con exito'});
	} catch (error) {
		sendError(res, error);
	}
});

router.post('/account/approve-first-step', async (req, res) => {
	console.log('Approve first step');
	try {
		const data: { id: string } = req.body;
		await approveAccountFirst(data.id);
		res.status(200).send({message: 'Primera fase de aprobación de cuenta bancaria realizada con exito'});
	} catch (error) {
		sendError(res, error);
	}
});

router.get('/account/permit-picture/:id', async (req, res) => {
	
	console.log('Permit picture');
	try {
		const id = req.params.id;
		const permit = await permitUploadPicture(id);
		res.status(200).send({permit});
	} catch (error) {
		sendError(res, error);
	}
});

router.post('/account/upload-picture/:id', async (req, res) => {
	
	console.log('Upload picture');
	try {
		const file = req.files?.file as UploadedFile;
		const id = req.params.id;
		
		if (!file) {
			res.status(400).send({message: 'No se envió ninguna imagen'});
			return;
		}

		await uploadPicture(file, id);
		res.status(200).send({message: 'Comprobante de identidad enviado con exito'});
	} catch (error) {
		res.status(500).send({message: 'Error al aprobar la cuenta'});
	}
});

router.get('/account', async (_, res) => {
	console.log('Get accounts');
	try {
		const accounts: Account[] = await getAccounts();
		res.status(200).send(accounts);
	} catch (error) {
		sendError(res, error);
	}
});

router.get('/account/news', async (_, res) => {
	console.log('Get new accounts');
	try {
		const accounts: Account[] = await getNewAccounts();
		res.status(200).send(accounts);
	} catch (error) {
		sendError(res, error);
	}
});

router.get('/account/pending-identity', async (_, res) => {
	console.log('Get pending identity accounts');
	try {
		const accounts: Account[] = await getAccountsPendingIdentity();
		res.status(200).send(accounts);
	} catch (error) {
		sendError(res, error);
	}
});


router.post('/account/aprove-identity', async (req, res) => {
	console.log('Approve identity');
	try {
		const data: { id: string } = req.body;
		await approveIdentity(data.id);
		res.status(200).send({message: 'Cuenta aprobada con exito'});
	} catch (error) {
		res.status(500).send({message: 'Error al aprobar la cuenta'});
	}
});

router.get('/picture/:id', async (req, res) => {
	console.log('Get picture');
	try {
		const id = req.params.id;
		await getPictureStream(id, res, metadata => {
			res.setHeader('Content-Type', metadata.contentType);
			res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);
		});
	} catch (error) {
		sendError(res, error);
	}
});

export default router;