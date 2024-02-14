import {DynamoDB} from "aws-sdk";
import {AccountDynamoModel} from "./models/Account";
import {DeleteItemInput, ExpressionAttributeValueMap, GetItemInput, PutItemInput, ScanInput, UpdateItemInput} from "aws-sdk/clients/dynamodb";

const dynamoDB = new DynamoDB({
	region: 'us-east-2',
	credentials: {
		accessKeyId: "AKIA47CRZQ57SEW2HDH3",
		secretAccessKey: "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"
	}
});

const TableName = "Accounts";

export async function putAccount(account: AccountDynamoModel): Promise<void> {
	const params: PutItemInput = {
		TableName,
		Item: account
	};
	try {
		
		console.log(params);
		await dynamoDB.putItem(params).promise();
		console.log("Item guardado en DynamoDB correctamente.");
	} catch (error) {
		console.error("Error al guardar la cuenta en DynamoDB:", error);
		throw error;
	}
}

export async function getAccount(key: string): Promise<AccountDynamoModel | undefined> {
	const params: GetItemInput = {
		TableName,
		Key: {id: {S: key}}
	};
	try {
		
		console.log(params);
		
		const data = await dynamoDB.getItem(params).promise();
		if (data.Item) {
			return data.Item as AccountDynamoModel;
		}
	} catch (error) {
		console.error("Error al obtener el item de DynamoDB:", error);
		throw error;
	}
}

export async function getAccounts(): Promise<AccountDynamoModel[]> {
	const params: ScanInput = {
		TableName
	};
	try {
		
		console.log(params);
		
		const data = await dynamoDB.scan(params).promise();
		if (data.Items) {
			return data.Items as AccountDynamoModel[];
		}
		return [];
	} catch (error) {
		console.error("Error al obtener los items de DynamoDB:", error);
		throw error;
	}
}

export async function deleteAccount(id: string): Promise<void> {
	const params: DeleteItemInput = {
		TableName,
		Key: {id: {S: id}}
	};
	try {
		
		console.log(params);
		
		await dynamoDB.deleteItem(params).promise();
		console.log("Item eliminado de DynamoDB correctamente.");
	} catch (error) {
		console.error("Error al eliminar el item de DynamoDB:", error);
		throw error;
	}
}

export async function updateAccount(id: string, updateExpression: string, expressionAttributeValues: any): Promise<void> {
	const params: UpdateItemInput = {
		TableName,
		Key: {id: {S: id}},
		UpdateExpression: updateExpression,
		ExpressionAttributeValues: expressionAttributeValues
	};
	try {
		
		console.log(params);
		
		await dynamoDB.updateItem(params as any).promise();
		console.log("Item actualizado en DynamoDB correctamente.");
	} catch (error) {
		console.error("Error al actualizar el item en DynamoDB:", error);
		throw error;
	}
}


export async function scanAccount(filterExpression: string, expressionAttributeValues: ExpressionAttributeValueMap): Promise<AccountDynamoModel[]> {
	const params: ScanInput = {
		TableName,
		FilterExpression: filterExpression,
		ExpressionAttributeValues: expressionAttributeValues,
	};
	try {
		
		console.log(params);
		
		const data = await dynamoDB.scan(params).promise();
		if (data.Items) {
			return data.Items as AccountDynamoModel[];
		}
		return [];
	} catch (error) {
		console.error("Error al obtener los items de DynamoDB:", error);
		throw error;
	}
}