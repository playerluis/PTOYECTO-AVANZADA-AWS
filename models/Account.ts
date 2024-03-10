import {AccountDto} from "./AccountDto";
import {ObjectId} from "mongodb";

export default interface Account {
	_id: ObjectId;
	names: string;
	lastnames: string;
	ci: string;
	fingerprintcode: string;
	email: string;
	sexo: string;
	age: number;
	reason: string;
	pictureId: string | null;
	firstApprove: boolean;
	secondApprove: boolean;
}

export function newAccountFromDto(dto: AccountDto): Account {
	return {
		_id: undefined as any,
		names: dto.names,
		lastnames: dto.lastnames,
		ci: dto.ci,
		fingerprintcode: dto.fingerprintcode,
		email: dto.email,
		sexo: dto.sexo,
		age: dto.age,
		reason: dto.reason,
		pictureId: null,
		firstApprove: false,
		secondApprove: false
	};
}