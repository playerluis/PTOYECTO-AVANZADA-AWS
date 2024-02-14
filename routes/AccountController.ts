import {Router} from 'express';
import {deleteAccount, getAccount, getAccounts, putAccount, scanAccount, updateAccount} from '../dynamoAccount';
import Account, {AccountDynamoModel, AccountDynamoModelToAccount, ContainsPicture, IsNull, NewAccountToAccountDynamoModel} from '../models/Account';
import EmailSender from "../services/EmailSender";
import RejectData from "../models/RejectData";


const router = Router();
const mailsender = new EmailSender();

router.post('/account/new', async (req, res) => {
	
	console.log('New account');
	
	const account: Account = req.body;
	const accounts = await scanAccount('ci = :ci', {':ci': {S: account.ci}});
	
	if (accounts.length > 0) {
		const accountFound = accounts[0];
		if (accountFound.firstApprove.BOOL && accountFound.secondApprove.BOOL) {
			res.status(400).send({message: 'Ya existe una cuenta aprobada asociada a ese numero de cedula'});
			return;
		}
		if (accountFound.firstApprove.BOOL) {
			res.status(400).send({message: 'Ya existe una cuenta en fase de aprobacion con ese numero de cedula'});
			return;
		}
		res.status(400).send({message: 'Ya existe una cuenta con ese numero de cedula'});
		return;
	}
	
	const dynamoAccount: AccountDynamoModel = NewAccountToAccountDynamoModel(account);
	
	try {
		
		await putAccount(dynamoAccount);
		await mailsender.sendHtml(
			account.email,
			'Cuenta bancaria solicitada',
			`<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<div style="background-color: #f4f4f4; padding: 20px;">
					<h1 style="color: #333; text-align: center;">Cuenta bancaria solicitada</h1>
					<p style="color: #666; text-align: justify;">
						Su cuenta ha sido solicitada con exito, espere aprobacion, este pendiente de su correo.
						<b>Datos de la cuenta:</b><br>
						Nombres: ${account.names}<br>
						Apellidos: ${account.lastnames}<br>
						Cedula: ${account.ci}<br>
						Codigo dactilar: ${account.fingerprintcode}<br>
						Correo: ${account.email}<br>
						Sexo: ${account.sexo}<br>
						Edad: ${account.age}<br>
						Motivo: ${account.reason}
					</p>
					
					<p style="color: #666; text-align: justify;">
						Atentamente,<br>
						El equipo de soporte del banco
					</p>
				</div>
			</main>`);
		
		
		res.status(200).send({message: 'Cuenta solicitada con exito, espere aprobacion, este pendiente de su correo'});
	} catch (error) {
		res.status(500).send({message: 'Error al solicitar la cuenta'});
	}
	
	
});

router.post('/account/reject', async (req, res) => {
	
	console.log('Reject account');
	
	const data: RejectData = req.body;
	const account = await getAccount(data.id);
	
	if (!account) {
		res.status(404).send({message: 'Algo salió mal, no se encontró la cuenta'});
		return;
	}
	
	if (account.firstApprove.BOOL && account.secondApprove.BOOL) {
		res.status(400).send({message: 'Esta cuenta ya ha sido aprobada'});
		return;
	}
	
	try {
		await mailsender.sendHtml(account.email.S,
			'Cuenta bancaria rechazada',
			`<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f4f4f4; padding: 20px;">
                    <h1 style="color: #333; text-align: center;">Cuenta bancaria rechazada</h1>
                    <p style="color: #666; text-align: justify;">
                        Su cuenta ha sido rechazada por el siguiente motivo: ${data.reason}. Si desea solicitar una cuenta bancaria nuevamente, no dude en hacerlo.
                    </p>
                    <p style="color: #666; text-align: justify;">
                        Atentamente,<br>
                        El equipo de soporte del banco
                    </p>
                </div>
            </main>`
		);
		await deleteAccount(data.id);
		res.status(200).send({message: 'Cuenta rechazada con exito'});
	} catch (error) {
		res.status(500).send({message: 'Error al rechazar la cuenta'});
	}
});

router.post('/account/approve-first-step', async (req, res) => {
	
	console.log('Approve first step');
	
	const data: { id: string } = req.body;
	const account = await getAccount(data.id);
	
	if (!account) {
		res.status(404).send({message: 'Algo salió mal, no se encontró la cuenta'});
		return;
	}
	
	if (account.firstApprove.BOOL) {
		res.status(400).send({message: 'Esta cuenta ya ha sido aprobada'});
		return;
	}
	
	const updateExpression = 'SET firstApprove = :firstApprove';
	const expressionAttributeValues = {':firstApprove': {BOOL: true}};
	
	try {
		await updateAccount(data.id, updateExpression, expressionAttributeValues);
		await mailsender.sendHtml(account.email.S,
			'Primera fase de aprobación de cuenta bancaria',
			`<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<div style="background-color: #f4f4f4; padding: 20px;">
					<h1 style="color: #333; text-align: center;">Primera fase de aprobación de cuenta bancaria</h1>
					<p style="color: #666; text-align: justify;">
						Su cuenta ha sido aprobada en la primera fase. A continuación, se le solicita que envíe una foto de su cédula de identidad en donde aparezca usted y su cédula de identidad, para poder continuar con el proceso de aprobación.<br>
						Esto se hace con el fin de verificar que la persona que solicita la cuenta es la misma que aparece en la cédula de identidad.
					</p>
					<a href="http://18.225.55.123:8080/subir-cedula-de-identidad/${account.id.S}" style="display: block; background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; text-align: center; border-radius: 5px; margin-top: 20px;">Subir cédula de identidad</a>
				</div>
			</main>`
		);
		res.status(200).send({message: 'Primera fase de aprobación de cuenta bancaria realizada con exito'});
	} catch (error) {
		res.status(500).send({message: 'Error al aprobar la primera fase de la cuenta bancaria'});
	}
});

router.get('/account/permit-picture/:id', async (req, res) => {
	
	console.log('Permit picture');
	
	const id = req.params.id;
	const account = await getAccount(id);
	
	if (!account) {
		res.status(404).send({message: 'Algo salió mal, no se encontró la cuenta'});
		return;
	}
	
	if (!account.firstApprove.BOOL) {
		res.status(400).send({message: 'Esta cuenta no ha sido aprobada en la primera fase'});
		return;
	}
	
	if (!IsNull(account.picture)) {
		res.status(400).send({message: 'Esta cuenta ya ha subido una foto de cédula de identidad'});
		return;
	}
	
	
	if (account.secondApprove.BOOL) {
		res.status(400).send({message: 'Esta cuenta ya ha enviado una foto de cédula de identidad'});
		return;
	}
	
	res.status(200).send({message: 'Permitir subir foto de cédula de identidad'});
	
});

router.post('/account/upload-picture', async (req, res) => {
	
	console.log('Upload picture');
	
	const data: { id: string, picture: string } = req.body;
	const account = await getAccount(data.id);
	
	if (!account) {
		res.status(404).send({message: 'Algo salió mal, no se encontró la cuenta'});
		return;
	}
	
	if (account.secondApprove.BOOL) {
		res.status(400).send({message: 'Esta cuenta ya ha sido aprobada'});
		return;
	}
	
	if (!IsNull(account.picture)) {
		res.status(400).send({message: 'Esta cuenta ya ha subido una foto de cédula de identidad'});
		return;
	}
	
	const updateExpression = 'SET picture = :picture, secondApprove = :secondApprove';
	//const expressionAttributeValues = {':picture': {B: Buffer.from(data.picture, 'base64')}, ':secondApprove': {BOOL: false}};
	const expressionAttributeValues = {':picture': {S: data.picture}, ':secondApprove': {BOOL: false}};
	
	try {
		await updateAccount(data.id, updateExpression, expressionAttributeValues);
		await mailsender.send(account.email.S, 'Cuenta bancaria aprobada', 'Su cuenta ha sido aprobada con exito');
		res.status(200).send({message: 'Comprobante de identidad enviado con exito'});
	} catch (error) {
		res.status(500).send({message: 'Error al aprobar la cuenta'});
	}
});

router.get('/account', async (_, res) => {
	
	console.log('Get accounts');
	
	const accountDynamoModels = await getAccounts();
	const accounts: Account[] = accountDynamoModels.map(AccountDynamoModelToAccount)
	
	res.status(200).send(accounts);
});

router.get('/account/news', async (_, res) => {
	
	console.log('Get new accounts');
	
	const accountDynamoModels = await scanAccount('firstApprove = :firstApprove', {':firstApprove': {BOOL: false}});
	const accounts: Account[] = accountDynamoModels.map(AccountDynamoModelToAccount)
	
	res.status(200).send(accounts);
});

router.get('/account/pending-identity', async (_, res) => {
	
	console.log('Get pending identity accounts');
	
	const accountDynamoModels = await scanAccount('firstApprove = :firstApprove AND secondApprove = :secondApprove', {':firstApprove': {BOOL: true}, ':secondApprove': {BOOL: false}});
	const accounts: Account[] = accountDynamoModels.filter((account) => !IsNull(account.picture)).map(AccountDynamoModelToAccount);
	
	
	res.status(200).send(accounts);
});


router.post('/account/aprove-identity', async (req, res) => {
	
	console.log('Approve identity');
	
	const data: { id: string } = req.body;
	const account = await getAccount(data.id);
	
	if (!account) {
		res.status(404).send('Algo salió mal, no se encontró la cuenta');
		return;
	}
	
	if (account.secondApprove.BOOL) {
		res.status(400).send('Esta cuenta ya ha sido aprobada');
		return;
	}
	
	const updateExpression = 'SET secondApprove = :secondApprove';
	const expressionAttributeValues = {':secondApprove': {BOOL: true}};
	
	try {
		await updateAccount(data.id, updateExpression, expressionAttributeValues);
		await mailsender.send(account.email.S, 'Cuenta bancaria aprobada', 'Su cuenta ha sido aprobada con exito');
		res.status(200).send({message: 'Cuenta aprobada con exito'});
	} catch (error) {
		res.status(500).send({message: 'Error al aprobar la cuenta'});
	}
});

export default router;