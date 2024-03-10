import Account, {AccountDto} from "../models/Account";
import RejectData from "../models/RejectData";

export const NewAccountEmail = (account: AccountDto) => {
	return `<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<img src="" style="width: 100%; height: auto;" alt="Banner">
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
			</main>`;
}

export const RejectedEmail = (data: RejectData) => {
	return `<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<img src="" style="width: 100%; height: auto;" alt="Banner">
                <div style="background-color: #f4f4f4; padding: 20px;">
                    <h1 style="color: #333; text-align: center;">Corrección de datos en el formulario - cuenta bancaria rechazada</h1>
                    <p style="color: #666; text-align: justify;">
                        Su cuenta ha sido rechazada por el siguiente motivo: ${data.reason}</br>
                        Si desea solicitar una cuenta bancaria nuevamente, no dude en hacerlo.
                    </p>
                    <p style="color: #666; text-align: justify;">
                        Atentamente,<br>
                        El equipo de soporte del banco
                    </p>
                </div>
            </main>`
}

export const FirstApproveEmail = (account: Account) => {
	return `<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<img src="" style="width: 100%; height: auto;" alt="Banner">
				<div style="background-color: #f4f4f4; padding: 20px;">
					<h1 style="color: #333; text-align: center;">Primera fase de aprobación de cuenta bancaria</h1>
					<p style="color: #666; text-align: justify;">
						Su cuenta ha sido aprobada en la primera fase. A continuación, se le solicita que envíe una foto de su cédula de identidad en donde aparezca usted y su cédula de identidad, para poder continuar con el proceso de aprobación.<br>
						Esto se hace con el fin de verificar que la persona que solicita la cuenta es la misma que aparece en la cédula de identidad.
					</p>
					<a href="http://18.225.55.123:8080/subir-cedula-de-identidad/${account.id}" style="display: block; background-color: #007bff; color: #fff; text-decoration: none; padding: 10px 20px; text-align: center; border-radius: 5px; margin-top: 20px;">Subir cédula de identidad</a>
				</div>
			</main>`
}

export const ApprovedAccountEmail = () => {
	return `
		<main style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
			<img src="" style="width: 100%; height: auto;" alt="Banner">
			<div style="background-color: #f4f4f4; padding: 20px;">
				<h1 style="color: #333; text-align: center;">Cuenta bancaria aprobada</h1>
				<p style="color: #666; text-align: justify;">
					Su cuenta ha sido aprobada con exito, ya puede disfrutar de los beneficios de su cuenta bancaria.
				</p>
				<p style="color: #666; text-align: justify;">
					Atentamente,<br>
					El equipo de soporte del banco
				</p>
			</div>
		</main>`
}