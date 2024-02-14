import {BinaryAttributeValue, BooleanAttributeValue, MapAttributeValue, NullAttributeValue, NumberAttributeValue, StringAttributeValue} from "aws-sdk/clients/dynamodb";
import {randomUUID} from "node:crypto";

export default interface Account {
	id: string;
	names: string;
	lastnames: string;
	ci: string;
	fingerprintcode: string;
	email: string;
	sexo: string;
	age: number;
	reason: string;
	//picture?: Buffer | Uint8Array | Blob | string | BinaryAttributeValue;
	picture?: string;
	firstApprove: boolean;
	secondApprove: boolean;
}

export interface AccountDynamoModel extends MapAttributeValue {
	id: { S: StringAttributeValue };
	names: { S: StringAttributeValue };
	lastnames: { S: StringAttributeValue };
	ci: { S: StringAttributeValue };
	fingerprintcode: { S: StringAttributeValue };
	email: { S: StringAttributeValue };
	sexo: { S: StringAttributeValue };
	age: { N: NumberAttributeValue };
	reason: { S: StringAttributeValue };
	//picture: { B: BinaryAttributeValue } | { NULL: NullAttributeValue };
	picture: { S: StringAttributeValue } | { NULL: NullAttributeValue };
	firstApprove: { BOOL: BooleanAttributeValue };
	secondApprove: { BOOL: BooleanAttributeValue };
	
}

export function AccountDynamoModelToAccount(model: AccountDynamoModel): Account {
	return {
		id: model.id.S,
		names: model.names.S,
		lastnames: model.lastnames.S,
		ci: model.ci.S,
		fingerprintcode: model.fingerprintcode.S,
		email: model.email.S,
		sexo: model.sexo.S,
		age: parseInt(model.age.N),
		reason: model.reason.S,
		//picture: ContainsPicture(model.picture) ? model.picture.B.toString('base64') : undefined,
		picture: IsNull(model.picture) ? undefined : model.picture.S,
		firstApprove: model.firstApprove.BOOL,
		secondApprove: model.secondApprove.BOOL
	}
}


export function NewAccountToAccountDynamoModel(account: Account): AccountDynamoModel {
	return {
		id: {S: randomUUID()},
		names: {S: account.names},
		lastnames: {S: account.lastnames},
		ci: {S: account.ci},
		fingerprintcode: {S: account.fingerprintcode},
		email: {S: account.email},
		sexo: {S: account.sexo},
		age: {N: account.age.toString()},
		reason: {S: account.reason || ''},
		picture: {NULL: true},
		firstApprove: {BOOL: false},
		secondApprove: {BOOL: false}
	};
	
}


export function ContainsPicture(value: { B: BinaryAttributeValue } | { NULL: NullAttributeValue }): value is { B: BinaryAttributeValue } {
	return 'B' in value;
}

export function IsNull(value:{ S: StringAttributeValue } | { NULL: NullAttributeValue }): value is { NULL: NullAttributeValue } {
	return 'NULL' in value;
}